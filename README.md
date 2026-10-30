# KANYI — AI-Powered Incident Triage

KANYI helps developers turn noisy log excerpts into prioritized incident assessments. It separates actionability, severity, confidence and false-positive risk, grounds observed evidence in exact source excerpts, and keeps past assessments searchable.

The [production readiness evidence dated October 14](docs/PRODUCTION_READINESS.md) records deployment and external-service blockers. The [October 28 AI validation](docs/verification/AI_RELIABILITY_VALIDATION.md) documents later offline improvements and leaves live quality/capacity unverified. A paid product needs more than a working diagnosis. See [the commercial release gate](docs/COMMERCIAL_RELEASE.md) for implemented customer behavior, cost assumptions, precise owner setup, evidence boundaries and what still prevents charging customers.

## Customer workflow

Marketing-only mode: public landing → synthetic interactive demo → explicit early-access-opening-soon state. No lead collection or authentication service is used.

Product mode with intake explicitly enabled: landing → early-access request → durable PostgreSQL acknowledgement. Requests do not create accounts or guarantee invitations. Existing users can sign in to the workspace for log assessments, searchable history and PDF export.

The landing does not promote paid subscriptions. The public form is hidden unless `VITE_EARLY_ACCESS_ENABLED=true` in a product-mode frontend build. Lead intake requires `EARLY_ACCESS_ENABLED=true` and migration 006; it is disabled by default. Read [early-access setup, retention/deletion requirements, and launch gates](docs/EARLY_ACCESS.md) before enabling collection. No live lead collection or production readiness is claimed.

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
cd backend
npm run migrate -- --apply
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

## Release documentation

Run `node scripts/release-check.cjs` for local checks. See [architecture](docs/ARCHITECTURE.md), [deployment](docs/DEPLOYMENT.md), [AI provider](docs/AI_PROVIDER.md), [database](docs/DATABASE.md), [billing](docs/BILLING.md), [backup/restore](docs/BACKUP_RESTORE.md), [incident integrations](docs/INCIDENT_INTEGRATIONS.md) and [release checklist](docs/RELEASE_CHECKLIST.md). The authenticated Render event PoC and password-confirmed non-billing account deletion are implemented; native webhook delivery and paid-account deletion automation are not.

Do not infer deployed readiness from local tests. The 2026-10-14 live provider run returned no validated results, the configured database rejected authentication, and the deployed API lacked this branch's readiness/billing routes. Billing and recovery delivery require owner setup and network verification before external users or paid launch.

## Landing conversion implementation

The early-access landing includes practical use cases, evidence/uncertainty explanations, transparent log handling and an opt-in PostgreSQL-backed request form. The form is hidden while intake is closed. No paid plans are promoted publicly. See [the implementation verification report](docs/verification/landing-page-2026-10-29/REPORT.md) for local test results, screenshots, changed files and remaining launch gates. These results do not establish production readiness.


## Independent public marketing build

`VITE_MARKETING_ONLY=true` renders the informational landing and synthetic demo without mounting authentication, session validation, password reset or the product workspace. Saved auth tokens are ignored and preserved. No product API requests or analytics events are sent, even if an old analytics preference is enabled. Sign-in, paid subscriptions and the request form are absent. The page explicitly says **Early access opening soon**.

Build-time configuration for this launch:

```dotenv
VITE_MARKETING_ONLY=true
VITE_EARLY_ACCESS_ENABLED=false
VITE_API_BASE_URL=
```

From `frontend`, install locked dependencies and build with those public variables in the build environment (`npm ci`, `npm run build`). Publish only `frontend/dist` to approved static HTTPS hosting after separate approval. No backend, Gemini/Stripe/email credentials, database, migrations or intake enablement is required. Do not deploy the full Compose stack for this static-only launch. Changes to VITE_* require a rebuild; setting runtime variables after building does not change the artifact.

Before public publishing, supply real approved `VITE_LEGAL_NAME`, `VITE_SUPPORT_EMAIL`, `VITE_PRIVACY_URL`, and `VITE_TERMS_URL` values as applicable to the approved disclosures. No identity, policy or retention promise is invented. Hosting access logs, any host analytics, local theme preferences and rights/contact handling need review even though this build collects no lead requests or logs. Final hostname, absolute social preview URLs and actual HTTPS/security-header checks remain launch tasks.

Outside marketing-only mode (unset or false), existing authenticated product behavior remains available. The form is independently opt-in via `VITE_EARLY_ACCESS_ENABLED=true` and requires working backend `EARLY_ACCESS_ENABLED=true`; keep both disabled until the lead-intake checklist passes. See [launch modes and deployment checklist](docs/EARLY_ACCESS.md#independent-marketing-only-launch).

Marketing-only implementation results and the changed-file manifest are in [the public-mode verification report](docs/verification/marketing-only-2026-10-29/REPORT.md).
