# P0 resolution and staging candidate

This work is limited to the three existing P0 blockers. No application features, UI redesign, model switch, retry relaxation, data reset or production migration is introduced. Preserve checkpoint `74106b32d27fa24661fab41c9e0a1c60551dd210`.

Candidate branch: `staging/p0-resolution-2026-10-14`. This branch snapshots the previously uncommitted hardened application. The exact release commit is available with `git rev-parse staging/p0-resolution-2026-10-14`; it must differ from the checkpoint. Remote `main` remains `a66e9eeb1423b6ed85611f10898dbad606bac262`. Do not merge or deploy to paid production as part of staging.

## 1. Database

The effective external configuration is the DATABASE_URL in backend/.env. PostgreSQL URL syntax, role/password/database presence, port 5432, URL encoding and whitespace checks pass. No pooler parameters are present. The app forces verify-full TLS; the actual TLS stream is encrypted and its certificate is authorized. The server explicitly rejects password authentication with SQLSTATE 28P01. This isolates the failure to the role/password/endpoint credential combination, not certificate verification, DNS, network reachability or dotenv selection. PostgreSQL deliberately does not reveal whether the password, role or chosen endpoint is wrong; claiming a more specific cause without the Neon control plane would be speculation.

DB_* points at a different local database and is correctly overridden by DATABASE_URL. The local target connects but contains an incomplete older schema. It is not an acceptable substitute for external staging and was not migrated. No external migration, data preservation, user isolation or DB readiness verification is possible until external authentication succeeds. No database writes or resets were made during this diagnosis.

Owner action: securely supply a fresh connection string from the intended staging Neon project/branch, or authorize the Neon account connection so the intended endpoint/role can be verified. Do not paste secrets into chat or rotate a production role blindly. Then run `cd backend && node scripts/diagnose-database.cjs --allow-remote`. On a verified isolated staging target, inventory/backup existing data, apply the reviewed migrations with `npm run migrate -- --apply`, verify ledger/indexes and preserved data, and run two-user API isolation plus /health/ready. Production data changes require separate authorization.

## 2. AI provider

The configured key can list models, gemini-3.6-flash is listed, and one real structured preflight succeeded in 4,815 ms. This rules out a consistently invalid key or universally invalid request schema. SDK endpoint overrides are absent.

The subsequent complete 28-case run returned **0/28 valid analyses**, with three generic provider failures and 25 rate-limit failures. Failed attempts included seven 503 UNAVAILABLE overload responses, two 504 DEADLINE_EXCEEDED responses and 25 429 RESOURCE_EXHAUSTED responses. The failed-operation mean latency was 2,963 ms and maximum 38,666 ms. Zero malformed outputs were observed because no analysis reached validation; evidence, hallucination and overconfidence quality rates are **not evaluable**, not proven zero.

A targeted unchanged real-analysis request exposed the exact terminal quota: `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, limit **20 requests/day**, RetryInfo **83,742 seconds**. The app correctly classified AI_QUOTA_CONFIGURATION and stopped retrying. This allowance cannot support the 28-case suite plus retries or establish a paid service. A 28-case run failing is not cured by a successful tiny prompt. Persistent overload also needs reassessment after the quota gate is resolved.

Explicit diagnostic comparisons were unsuccessful (2.5 Flash: 404; 3.7 Flash: 499; 3.8 Flash: deadlines and 400). These were process-local diagnostic selections only. The application remains on gemini-3.6-flash; there is no fallback or bypass.

Owner action: enable appropriate Gemini project billing/quota, or securely supply an approved project with sufficient capacity for the suite, retry budget and intended users. Rerun `EVALUATION_REPORT=/tmp/kanyi-staging-ai.json npm run evaluate:live`, inspect per-case results and review diagnostic usefulness/evidence manually. Do not call AI reliable until actual output supports it. [Google's rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits) explains project quota controls; the captured provider response establishes this project's 20/day limit.

## 3. Staging deployment

Local release checks pass: backend syntax and fixture validation; 126 backend tests; 30 isolated PostgreSQL tests; frontend ESLint, TypeScript and production build; zero vulnerabilities in both npm audits. The database tests use an ephemeral local cluster and fixture AI/Stripe; they do not establish external staging success.

`deploy/render.staging.yaml` validates against Render's public Blueprint schema. It declares one new free staging backend, the staging branch, production startup checks, /health/ready, explicit missing-secret prompts, disabled automatic deployment and BILLING_ENABLED=false. It does not create/reset a database or run migrations automatically. Render can import a custom Blueprint path; [Render's specification](https://render.com/docs/blueprint-spec) is the configuration reference. Schema validation does not prove account permission or successful deployment.

Render account access is unavailable. Existing stored Vercel credentials return HTTP 403 for identity and projects. GitHub remote access and a staging-branch push dry run succeed; main has an existing Vercel integration, so a staging branch push can be checked for a frontend preview. Do not treat a frontend preview as a complete staged backend release. The initial hardened source commit is `1a713cb0292e0c3e802bcc36795fb23c73343c3d`, published to the staging branch. Vercel's GitHub status reports a successful preview build at https://vercel.com/franvaargs-projects/devops-ai/AC9MXoUhP5WGxvBo3FkbRbqScoz1. Account/API access remains 403, so the actual preview hostname and application HTTP behavior are not verified. The source branch push does not update main. A frontend build is not evidence of a staged backend or an end-to-end smoke pass.

The first GitHub validation run (38662828589) confirms backend and frontend jobs pass, including isolated SQL tests, lint/types/build and audits. Its browser job caught intermediate dark-mode transition colors in the accessibility scan. The follow-up changes only the browser test's synchronization: it waits up to five seconds for finite animations to settle before running the same axe rules. No contrast waiver, app color change or UI redesign is introduced. Inspect the latest branch CI result after this correction; do not count the initial failed browser run as a pass.

Owner inputs needed for a working backend: authorized Render staging service access, verified staging DATABASE_URL, adequate Gemini project quota, real Brevo key/sender, measured proxy hops and exact HTTPS frontend/CORS origins. Do not set NODE_ENV=development to bypass startup. The separate Vercel staging/preview must use the new staging backend origin; never silently point tests at the current production API. If Vercel's integration cannot deploy the branch, refresh Vercel authorization too.

Use the exact candidate SHA and new isolated service; import the staging Blueprint only after confirming it cannot modify an existing production service. Review/backup/migrate the verified staging database first, deploy backend, configure the frontend staging API origin, deploy frontend preview, then verify the expected endpoints and full smoke sequence. No paid-production promotion is authorized here.

Post-deployment smoke remains blocked: there is no deployed isolated Render backend, no verified external DB access and insufficient AI quota. Landing/application HTTP is also unverified because the working preview URL/access has not been established. Signup, login, actual email reset, analysis/result, history/upload/quota, billing entry, health/readiness and two-user isolation must be tested on the verified staging target after those gates are resolved. Existing Render probes initially timed out; a bounded readiness retry returned 404, confirming the new backend endpoint is still absent. No production signup or analysis was used as a substitute for staging tests.

Smoke sequence: landing; two synthetic user registrations; login/logout; actual recovery email and single-use reset; paste and upload analyses; real provider result/evidence/unknowns/verification; history/export/delete; quota accounting and replay; billing plans entry (disabled sales expected initially); /health/live and /health/ready; cross-user history/deletion/account denial. A disabled entry point does not verify real Stripe checkout. Compare this with local fixture/SQL results and explicitly record any credential-blocked step rather than claiming success.

## Current gates

| Gate | Result |
| --- | --- |
| Database | BLOCKED BY OWNER ACTION |
| AI provider reliability | BLOCKED BY OWNER ACTION |
| AI trustworthiness | BLOCKED BY OWNER ACTION |
| Production deployment | BLOCKED BY OWNER ACTION |
| Core stability | PARTIAL |
| Authentication | PARTIAL |
| Authorization/user isolation | PASS |
| Billing readiness | BLOCKED BY OWNER ACTION |

Authorization PASS is scoped to verified local application/PostgreSQL tests, not the undeployed external environment. Billing still needs real provider credentials and lifecycle verification before limited paid use. Resolving these three P0s alone does not manufacture a verified Stripe flow or email delivery.

Final verdict: **NOT READY**. Detailed new evidence is under `docs/verification/p0-resolution-2026-10-14/`; original hardening evidence remains unchanged.
