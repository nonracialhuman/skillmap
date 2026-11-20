# Security policy

Please do not report security problems in public issues.

Report them privately to the maintainer. Use GitHub's private vulnerability
reporting ("Security" tab → "Report a vulnerability") if it is enabled for this
repository. Please include steps to reproduce and the impact you expect.

## What the app protects

- **The Groq API key** stays server-side. No variable uses the `VITE_` prefix, so
  none reach the browser bundle.
- **Spend and abuse** are bounded by per-IP limits, a global daily cap, and a lower
  cap while the shared Redis store is unreachable. See the README section on
  environment variables.
- **User input** is validated and word-capped. It reaches the model only as JSON
  data inside a delimited block. Model output is schema-validated before it is
  returned.
- **Logs** never contain skills text, goal text, prompts, IPs or keys.

## Deployment checklist

- Set `RATE_LIMIT_SALT` to a random value.
- Configure Upstash Redis so limits are shared across instances.
- Set `TRUST_PROXY` only behind a reverse proxy that overwrites `X-Forwarded-*`. On
  Vercel this is automatic.
