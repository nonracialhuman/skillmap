## What and why

<!-- One or two sentences: what changes, and the problem it solves. -->

## How it was tested

- [ ] `npm run check` (lint, unit tests, build)
- [ ] `npm run test:e2e` if the UI or an API response changed
- [ ] New behaviour has a test that fails without the change

## Checklist

- [ ] No secrets, `.env` files or API keys in the diff
- [ ] New env vars are documented in `.env.example` and the README table
- [ ] New endpoints are in `server/routes.js` with an adapter in `api/`
- [ ] AI estimates stay labelled separately from measured data
