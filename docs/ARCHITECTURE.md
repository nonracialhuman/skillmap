# SkillMap architecture

How a request flows, what the API accepts and returns, and what it logs. For setup and
configuration see the [README](../README.md).

## Contents

- [Request pipeline](#request-pipeline)
- [Live job-posting data](#live-job-posting-data-post-apimarket)
- [API contract](#api-contract)
- [Limits](#limits)
- [Logging](#logging)

## Request pipeline

```
Browser (React, src/App.jsx)
   │  POST /api/analyze  { skills, goal, location }
   ▼
api/analyze.js (Vercel)  ──┐
vite.config.js (dev/preview) ──┴─► server/handler.js
        1. CORS (same-origin + ALLOWED_ORIGINS; never "*")
        2. body size cap (8 KB) + JSON parse
        3. input validation (server/schema.js, zod)
        4. rate limit: per-IP minute/day + global daily cap (server/rateLimit.js)
        5. LLM call (server/llm.js): JSON mode, 50 s overall deadline,
           one retry on invalid / truncated / schema-failing output
        6. output validation + cleanup (server/schema.js ReportSchema)
        7. structured log line (server/log.js), sanitized error envelope (server/errors.js)
   ▼
{ requestId, report, meta: { model, promptVersion, estimate: true, disclaimer } }
```

## Live job-posting data (`POST /api/market`)

Input is `{ goal, location }`, validated like `/api/analyze`; a target role is
required. It needs no Groq key and runs in parallel with the AI report.

1. Fetch the job lists of the boards in `server/market/boards.js`. This is a fixed,
   server-side list, so user input never becomes part of a URL. Lists are cached for
   6 h.
2. Keep postings whose **title** matches the role (`server/market/filters.js`) and
   whose location matches the region. If fewer than 10 match locally, use all
   locations and say so.
3. Fetch full descriptions for matches only. That is at most 15 per company and 150
   in total, cached for 24 h.
4. Extract skills with the shared taxonomy (`server/market/extract.js`). This uses no
   LLM, so counts are reproducible. Common-word collisions ("go", "react to",
   "rest") are guarded against.
5. Return the top 15 skills as `count` and `share`, plus `sampleSize`, `scope`,
   `lowSample` (n < 30), companies, board health, the source, `fetchedAt` and up to
   6 example posting links. Results are cached for 1 h.

Caveats shown in the UI:

- The boards skew toward tech companies and startups.
- Dictionary matching under-counts niche tools.
- Small samples are flagged.

The UI shows aggregate counts and links out to postings; it does not republish job
descriptions.

## API contract

**Success (200):**

```json
{ "requestId": "…", "report": { "risingSkills": [], "knowledgeGraph": {}, "careerPaths": [],
  "dyingSkills": [], "topMicroSkills": [] }, "meta": { "model": "…", "estimate": true, "disclaimer": "…" } }
```

**Error:**

```json
{ "requestId": "…", "error": { "code": "INVALID_INPUT", "message": "…", "retryable": false,
  "issues": [{ "field": "skills", "message": "…" }] } }
```

| Status | Codes |
|---|---|
| 400 | `INVALID_JSON`, `INVALID_INPUT` |
| 403 | `ORIGIN_NOT_ALLOWED` |
| 405 | `METHOD_NOT_ALLOWED` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 429 | `RATE_LIMITED`, `DAILY_LIMIT` (with `Retry-After`) |
| 500 | `INTERNAL` (includes Groq 4xx request errors, which a retry cannot fix) |
| 502 | `BAD_OUTPUT`, `UPSTREAM_ERROR` |
| 503 | `UPSTREAM_BUSY` (Groq 429/5xx, with `retryAfterSeconds` when known), `SERVICE_UNAVAILABLE`, `GLOBAL_DAILY_CAP` |
| 504 | `TIMEOUT` |

`retryable` in the error body tells the client whether trying again could help.

Provider error bodies, the model's raw output and token usage are never returned to the
client.

## Limits

| Input | Limit |
|---|---|
| Skills | 1–25 items, ≤ 40 characters and ≤ 5 words each, ≤ 800 characters total. Letters (any script, including combining marks), numbers, spaces and `. + # / & ( ) ' - _` only. Text is NFC-normalized; newlines and tabs are rejected |
| `location` | One of `US`, `India`, `EU`, `UK`, `Remote` (case-insensitive) |
| `goal` | One of the 29 preset roles, or a custom role ≤ 60 characters and ≤ 8 words with the same character rules. Custom roles are kept on purpose, so users can type roles that are not in the list |

Model output is validated leniently: a malformed item (one bad edge, an empty skill)
is dropped rather than failing the whole report, over-long lists are truncated, and
non-numeric scores get neutral defaults. A section with no valid items still fails
validation and triggers the single retry.

User text is sent to the model as JSON inside a delimited `<profile>` block. The prompt
tells the model to treat that block as data, not instructions.

## Logging

Each request produces one JSON line, `event: "analyze"`. It contains:

- request ID, status and error code
- latency
- model, prompt version and attempts
- prompt, completion and total tokens
- skills **count**, location enum and goal kind (`none`, `preset` or `custom`)

It never contains the skills text, the goal text, the prompt, the IP or the key.
`/api/market` logs `event: "market"` with sample size, scope, boards OK, failed
detail fetches, `degraded` and `cached`.

Events worth alerting on:

| Event | Level | Meaning |
|---|---|---|
| `ratelimit_config` | error | Production without Redis, half-set Redis env, or missing salt (logged at startup) |
| `ratelimit_degraded` | error | Redis unreachable; limits fell back to memory with `DEGRADED_DAILY_CAP` (at most once a minute) |
| `market_boards_failed` | warn | One or more job boards failed, with the reason per board |
| `market_details_failed` | warn | Posting detail fetches failed; the result is marked `degraded` |
