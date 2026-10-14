# KANYI — incident intelligence

KANYI helps developers turn noisy log excerpts into prioritized incident assessments. It separates actionability, severity, confidence and false-positive risk, grounds observed evidence in exact source excerpts, and keeps past assessments searchable.

The [current transformation audit and plan](docs/TRANSFORMATION_AUDIT.md) records the latest work. A paid product needs more than a working diagnosis. See [the commercial release gate](docs/COMMERCIAL_RELEASE.md) for implemented customer behavior, cost assumptions, precise owner setup, evidence boundaries and what still prevents charging customers.

## Customer workflow

Public landing and pricing → account creation → safe example or real log excerpt → evidence-backed assessment → searchable history/PDF export → monthly quota → Stripe Checkout → verified subscription activation → billing portal and cancellation.

Free includes 50 successful analyses per UTC calendar month. Pro includes 500. Both accept text logs up to 16 KiB and optional operational context, and use the same assessment standards. Team is planned and not sold. Paid offers are unavailable unless billing is explicitly configured and enabled. Selling price is retrieved from Stripe, not hardcoded in the UI.

## Architecture

React/TypeScript/Vite frontend; Express API; PostgreSQL persistence; Google Gemini analysis; Stripe hosted Checkout and Customer Portal. Server-side quotas and entitlements control capacity. Signed webhooks retrieve current provider subscription state, persist updates transactionally and reject mismatched accounts. A checkout return URL never grants paid access.

The frontend Docker image serves built static assets with Nginx rather than a development server. Its `/api` proxy reaches the backend on the Docker network. Separate frontend hosting uses `VITE_API_BASE_URL` at build time.

## Local setup

```sh
cp .env.example .env
cp backend/.env.example backend/.env
```

Configure the PostgreSQL password in the repository `.env`, plus a strong JWT secret and Gemini key in `backend/.env`. Configure email delivery for password recovery. Keep billing disabled for local use without Stripe credentials. Local Compose defaults to development backend mode; production requires `NODE_ENV=production`, exact CORS origins, an HTTPS frontend URL and trusted ingress settings.

```sh
docker compose up --build
```

Frontend: `http://localhost:5173`. Backend: `http://localhost:3000`. PostgreSQL binds to `127.0.0.1:5433`. Production requires HTTPS ingress; Compose alone does not provide it.

Existing database volumes require migrations; initialization scripts only run for fresh volumes. Back up before applying:

```sh
psql "$DATABASE_URL" -f database/migrations/001_saas_foundations.sql
psql "$DATABASE_URL" -f database/migrations/002_trustworthy_analysis.sql
psql "$DATABASE_URL" -f database/migrations/003_analysis_reservations.sql
psql "$DATABASE_URL" -f database/migrations/004_commercial_product.sql
```

See `database/migrations` and [operations](OPERATIONS.md). All migrations are rerunnable. The commercial migration stores decision/context metadata and billing event deduplication without discarding existing history. Older analyses explicitly show that noise/actionability was not assessed.

## Verification

```sh
cd backend
npm ci --ignore-scripts
npm test
npm run test:integration
```

Integration tests create an isolated temporary PostgreSQL cluster; they refuse a shared or remote database. Set `PG_TEST_BIN` if server binaries are installed elsewhere. Stripe/Gemini network calls are fixtures in local tests, not evidence of live provider behavior.

```sh
cd frontend
npm ci --ignore-scripts
npm run lint
npm run build
```

A desktop/mobile browser workflow is available in `frontend/scripts/verify-journey.cjs`. It requires Playwright, `@axe-core/playwright`, and a running local frontend; set `PLAYWRIGHT_MODULE`, `APP_URL`, and optionally `BROWSER_REPORT_DIR`. It explicitly uses network fixtures and saves screenshots/report evidence. A real purchase is a separate release gate.

## Trust and release references

- [Commercial readiness, pricing and billing setup](docs/COMMERCIAL_RELEASE.md)
- [Security and data handling](SECURITY.md)
- [Operations and reliability](OPERATIONS.md)
- [API errors and retry semantics](API.md)
- [Backend tests](backend/TESTING.md)

Logs and context go to Gemini after best-effort secret redaction and are stored with the result. Remove confidential data before submission. Deletion removes the live stored analysis; backup/provider retention is an owner policy/configuration decision. Evidence validation establishes provenance, not causal certainty. No unsupported certifications, testimonials or accuracy claims are made.

Copyright © 2026 Francisco (Fran) Vargas. All rights reserved. Existing ownership and license terms apply.
