# Contributing to SkillMap

## Setup

```bash
nvm use            # Node 22 (see .nvmrc; Vite 8 needs 22.12+)
npm ci
cp .env.example .env   # GROQ_API_KEY is only needed to run real analyses
npm run dev
```

Without a Groq key the app still runs: analyses return a friendly 503, and the
job-posting section works.

## Before you open a pull request

```bash
npm run check      # lint + unit tests + build (CI runs the same)
npm run test:e2e   # Playwright, desktop and mobile
```

CI also runs `npm audit` on production dependencies.

## Where code goes

See "Project structure" in the README. In short:

- **`server/`** holds all API logic. It must not import from `src/` or React; ESLint
  enforces this.
- **`src/`** is the React client. It must not import from `server/` or `api/`.
- **`shared/`** is for anything both sides need.
- **`tests/`** mirrors the source tree (`tests/server`, `tests/client`,
  `tests/shared`). End-to-end specs go in `e2e/`.

## Conventions

- **Commits:** Conventional Commits (`fix(server): …`, `feat(ui): …`, `docs: …`,
  `test(e2e): …`).
- **Tests:** a bug fix comes with a test that fails without it. Query the UI by
  role and accessible name, not CSS classes.
- **API errors:** go through `AppError` codes in `server/errors.js`. Never send
  provider messages or raw model output to the client.
- **Logging:** never log user-entered text, IPs or keys. Log counts and enums.
- **Measured vs estimated:** anything the model produces is labelled as an
  estimate. Only job-posting counts are shown as measured.
