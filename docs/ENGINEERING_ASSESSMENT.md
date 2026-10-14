> Latest verification (2026-10-07): see [the transformation readiness report](TRANSFORMATION_READINESS.md) and [current evidence](verification/2026-10-07/summary.json). Earlier results below remain historical and do not establish current commercial readiness.

# KANYI engineering assessment and delivery roadmap

Audit date: 2026-09-21. Baseline: 47206fe; working tree clean before work.
This is a source and local validation assessment, not a production certification.

## Verified architecture

React/TypeScript/Vite SPA: App manages authentication; Home owns analysis and
history state. Bearer JWTs live in localStorage. API errors are plain messages;
session handling infers authentication failures from text. React renders model
output as text. PDF generation is client-side jsPDF, eagerly imported. History
loads up to 50 records including full logs; charts describe this subset, not all
account activity. Uploads use FileReader without size or content checks.

Express 5/CommonJS: app.js owns analysis/history endpoints, route modules own
auth/account. Services use parameterized pg queries. History reads/deletes scope
by authenticated user. Password hashing uses bcrypt cost 12; reset tokens are
random, hashed at rest, expire, and revoke JWTs through token_version. Recovery
email uses Brevo with a timeout, but holds a DB transaction across delivery.
Duplicate registration returns 409, so generic wording does not eliminate
account enumeration. Logout clears browser state without server revocation.

PostgreSQL: users, analyses, monthly_usage, password_reset_tokens. Two explicit
additive migrations, no migration runner/version ledger or real DB test suite.
Quota increment and persistence are transactional, but AI runs before reservation.
There are no workspaces, projects, services, incidents, integrations or jobs.
Gemini receives raw logs and a JSON schema, but JSON.parse alone is not validation.
The existing malformed-output API test mocks a thrown error; it does not test
actual provider output validation. Confidence is model-generated, not calibrated.

Deployment: Vercel rewrite exists; Render configuration is not codified. Docker
Compose supplies local PostgreSQL. Frontend Dockerfile serves the Vite development
server. frontend/env is not a Vite .env file. Backend checks JWT length, but lacks
comprehensive startup validation, readiness, graceful shutdown and safe structured
logging. CORS allows every origin when unset; rate limits are process-local.
Frontend src/app.js and src/server.js are unused Express remnants. No CI/E2E,
backup automation, operational runbooks or license file were found. README claims
MIT while backend metadata says ISC; ownership/license decision remains unresolved.

## Baseline checks

- npm ci --ignore-scripts succeeds for both lockfiles; no dependency lifecycle scripts run.
- Frontend ESLint and TypeScript/production build pass. Main JS is 1,063 kB
  minified / 322 kB gzip; bundle warning merits lazy PDF/chart loading.
- API tests need local sockets; sandbox run fails. Re-run outside sandbox recorded
  separately. Existing DB tests are mocks, not PostgreSQL integration validation.
- npm audit: backend qs moderate; frontend browserslist high and
  baseline-browser-mapping moderate. These are advisory severities, not a claim
  that each path is remotely exploitable in KANYI. Target transitive updates only.
- Live Gemini, Brevo, Neon, Render and Vercel behavior, production secrets, database
  contents, restore readiness and browser accessibility are not verified.

## Priorities and dependency order

| Priority | Finding / deliverable | Acceptance gate |
| --- | --- | --- |
| P0 | Unredacted secrets reach Gemini; raw output/error logs may disclose data | Redaction before provider and new persistence; no raw provider logging; boundary tests |
| P0 | DATABASE_URL disables certificate verification | Verified TLS configuration and staging connectivity check before deployment |
| P1 | Unvalidated AI data, unbounded provider time/retries | Strict bounded contract, source-backed excerpts, explicit uncertainty, bounded request |
| P1 | Quota check races before paid call | Durable reservation before provider, failure policy, real concurrent DB tests |
| P1 | Dependency advisories and weak deployment gates | Targeted lock updates, audit, CI, staging smoke tests |
| P1 | Missing tenancy and incident workflow | Additive workspace membership/project/environment/service/incident migrations; scoped repositories; real cross-tenant tests; history preserved |
| P1 | No complete incident product | Dashboard/detail/timeline/resolution, onboarding, evidence provenance, runbooks, factual postmortem drafts |
| P1 | Operational blind spots | Request IDs, safe structured events, error taxonomy, health/readiness, config validation, recovery drill |
| P1 | Integrations and ingestion | Hashed scoped keys; bounded idempotent ingestion; PostgreSQL durable jobs; GitHub adapter and signature verification |
| P1 | Notifications and commercial controls | Durable deduplicated email/Slack preferences; centralized workspace entitlements; metadata-only analytics |
| P1 | Privacy and session UX | Document AI data flow; account/workspace export/delete; status-based session errors; resilient network/loading states |
| P2 | Performance and maintainability | Cursor pagination, bounded raw-log UI, lazy PDF/charts, focused controllers, composite indexes after query review |
| P2 | Release confidence and diligence | Browser journeys, accessibility, license inventory, deployment manifests, backup/restore and troubleshooting docs |
| P3 | Scale/enterprise | Distributed limiting, advanced retention, SSO/RBAC, deeper metrics correlation; only after customer need |

## Migration strategy

Keep current APIs compatible. First add tenant tables and membership constraints;
backfill a personal workspace for each existing user in a restartable migration.
Preserve analyses and ownership; link incidents to analyses instead of replacing
history. Require workspace scope in every repository query and composite foreign
keys where needed to prevent cross-workspace relationships. Validate backfill on
a restored copy before production. Do not introduce Redis or Stripe yet.

Deliver small milestones: (1) AI/privacy boundary, (2) operational/TLS/quota
foundation, (3) tenancy and incident vertical slice, (4) durable ingestion/GitHub,
(5) notifications/runbooks/postmortems and commercial onboarding. Each requires
tests, lint/build where applicable, docs, and a coherent commit. No production
migration or deployment is authorized implicitly by a successful local test.

## Milestone 1 result

Baseline backend suite: 65 passed outside the socket-restricted sandbox.
Implemented best-effort secret redaction before provider transmission and new
history persistence; strict bounded AI output validation with literal source
excerpts; insufficient-evidence downgrade; bounded SDK timeout/output/no retries;
safe analysis failure logging; user-facing AI disclosure. Existing history and
API field names are preserved. Added hosted database TLS verification that cannot
be weakened by URL parameters. No database migration or production action taken.

Eight additional behavior tests cover redaction, provenance, malformed output,
empty evidence, the API-to-storage privacy boundary and pg TLS configuration.
73 backend tests pass. Targeted transitive updates resolve all advisories reported
by npm audit in both packages (zero reported after update). This is not proof of
absence of vulnerabilities. No direct dependency major versions changed.

Remaining immediate work: staging Gemini contract/availability and verified TLS
smoke tests; safe structured logging beyond analysis; durable quota reservation;
real PostgreSQL transaction/migration tests. Redaction remains heuristic, evidence
matching does not prove causation, old stored logs may contain secrets, and the
initial frontend bundle remains oversized. The rest of the roadmap is pending.


## Milestone 2: operational reliability

Durable reservations now precede AI calls; the successful persistence commit is
the billable point. Same-key retries replay completed work without another charge.
The new additive migration preserves historical usage and analyses. Real PostgreSQL
coverage replaces four mocked quota tests and exercises constraints, concurrency,
auth persistence, HTTP analysis/replay and migration reapplication.

Structured metadata logs, request IDs, error taxonomy and provider outcome timing
are implemented. Brevo rejects redirects and closes unused response streams.
See OPERATIONS.md, API.md and backend/TESTING.md for consistency semantics,
privacy limitations, deployment gates and test isolation. Remaining work includes
staging provider/TLS checks, distributed request rate limits, reset email outbox,
log-sink retention, frontend bundle reduction, then tenant/incident development.
No production migration or deployment occurred.

Local milestone validation: 78 unit/API tests and 13 isolated PostgreSQL integration
tests pass. Frontend ESLint and TypeScript/production build pass. The existing
large-bundle warning remains. No runtime dependencies were added or changed.
GitHub Actions/PostgreSQL 16 is configured but has not been run remotely here.
