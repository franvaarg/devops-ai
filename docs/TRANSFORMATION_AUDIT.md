# KANYI transformation audit and implementation plan

Audit date: 2026-10-07. Existing uncommitted commercial work is preserved. No production deployment, migration, payment, purchase or pricing change is authorized in this milestone.

## Executive audit

React 19/TypeScript/Vite and Express 5/PostgreSQL remain appropriate for a focused individual SaaS. Existing code implements structured Gemini decisions, literal evidence validation, best-effort redaction, transactional monthly quota reservations, user-scoped history/deletion, PDF export, and Stripe-hosted checkout/portal with signed webhooks. These are substantive implementation strengths; prior reports are historical evidence, not current verification.

Important gaps found by reading the implementation:

- Server starts without a DB/schema readiness check, health endpoints or shutdown drain. A listening process cannot establish working dashboard/history access.
- DATABASE_URL takes precedence over DB_* and enforces verified TLS. Do not repair an authentication failure by weakening TLS or resetting a database. Current credentials need a read-only diagnosis.
- Gemini retries already have three attempts, exponential jitter, hard-quota detection, abort signals, a 20s attempt timeout and 45s overall deadline. Prior real rounds passed only 4/8 cases and hit a daily Free-tier quota. Current provider reliability remains unverified.
- Empty evidence reduces confidence but can retain Critical severity. The contract lacks explicit Insufficient Evidence actionability. Four synthetic provider cases do not cover the requested operational categories.
- Auth uses bcrypt cost 12 and versioned seven-day JWTs in localStorage. Reset revokes sessions; logout is local only. Email ownership verification and account deletion are absent. Per-process rate limits require deployment/abuse controls.
- Billing grants entitlements only through server state and current subscription retrieval; expiry removes Pro. Webhooks deduplicate. Calls to Stripe under user locks can occupy DB connections for multiple network deadlines. Missed renewal events require replay; automated reconciliation is absent.
- Landing communicates the workflow and restrained branding, but its public example is static. Real analysis requires signup. Fixture browser journeys cannot prove working DB, Gemini or payments.
- Docker/Vercel files exist; no Render blueprint or Neon-specific infrastructure is present. Actual remote configuration, backups, restoration and monitoring are unverified. Docker DB initialization does not migrate existing volumes.
- Existing docs contradict current provider limits. Legal/support links depend on owner configuration. Current environment has no Stripe test credentials or Brevo delivery credential.

## Prioritized milestones

| Priority | Deliverable | Verification / gate |
| --- | --- | --- |
| P0 | Read-only DB/configuration diagnostics | Auth/network/schema classifications; no secret output or writes |
| P0 | Health endpoints and graceful shutdown | DB failure returns safe 503; draining stops admission; bounded shutdown |
| P0 | Explicit insufficient evidence and conservative severity | Contract regression tests and compatible history rendering |
| P0 | Rerun baseline and security checks | Unit/API, isolated PostgreSQL, lint/type/build, dependency audits |
| P1 | Broaden synthetic incident evaluation | Ten operational categories plus injection; evidence, severity and actionability assertions; retain real failures |
| P1 | Public interactive demonstration | Clearly labeled deterministic synthetic examples; desktop/mobile browser checks |
| P1 | Current readiness report | Separate actual provider, DB and billing evidence from fixtures |
| P1 release gate | Real Stripe Test Mode lifecycle | Owner credentials/test environment; actual checkout, webhook, portal and cancellation |
| P1 release gate | Production operations and privacy | Owner staging/production access, restore/rollback drill, policies, support and budgets |
| P2 | Session architecture, verified signup, abuse controls, reconciliation | Separate reviewed milestones; no premature enterprise rewrite |
| P2 | Pricing/pilot validation | Representative sizes/retry costs, interviews, activation and repeat usage |

## Product focus and commercial validation

Initial hypothesis: individual developers and small engineering teams repeatedly investigating deployment/application excerpts, especially noisy legacy systems. Recurring value is consistent decisions, traceable excerpts and a searchable investigation record. No comparative accuracy/speed/security claims are supported. Renewal value and willingness to pay require a customer pilot.

Keep existing Free 50 / Pro 500 limits and retrieve selling price from Stripe. $29/month is a proposal, not approved pricing. At 500 used analyses revenue per included success would be $0.058 before tax/payment/hosting/support; an 80% contribution-margin target permits only $5.80 total variable cost ($0.0116 per success before fixed costs). Failed generations and retries cost money even when quota is not consumed. Measure all attempts and near-limit logs before approval. Team remains unsold.

## Newly discovered P0 defects

Fresh registry audits found critical proxy-addr and high source-map-js advisories; compatible transitive updates remove both. Registration/reset previously accepted passwords over bcrypt’s 72-byte limit while login rejected them: new credentials now share the same limit. Existing affected accounts need owner-configured password recovery. JWT claims and algorithm are now validated; logout revokes all account tokens rather than only clearing the browser.
