# Operational reliability

## Quota consistency and billing point

Free remains 50 successful analyses/month; active/trialing Pro remains 500.
The backend derives limits from persisted subscription state. UTC calendar months
are used explicitly; already stored usage is preserved. On admission, a short
PostgreSQL transaction locks the user row (`FOR UPDATE`), counts committed usage
plus unexpired reservations, and inserts a pending `analysis_requests` row.
All reservation, completion and release writers use the same lock order.
Already admitted reservations are honored if a plan changes; later admissions
use the new authoritative plan.
READ COMMITTED plus this per-user serialization prevents two requests from taking
the last slot. Different users can proceed independently. Usage reads are a
snapshot for display, never an authorization decision.

The reservation commits **before** Gemini starts. No transaction or database
connection is held while Gemini runs. A second transaction atomically inserts the
analysis, increments usage in the reservation's month, and marks completion.
That commit is the billable point. Provider, validation or persistence failures
leave usage unchanged; release marks a pending request failed. A process crash
leaves capacity reserved for at most two minutes. Expiry is evaluated from the
PostgreSQL clock, without a worker or Redis. An expired operation cannot complete.
Late releases never refund already committed work. Calls that succeed at Gemini
but fail persistence can still cost KANYI money; customers are not charged quota.

`Idempotency-Key` is scoped to the authenticated user. Completed retries return
the existing analysis without another AI call or usage increment. Concurrent
retries return `ANALYSIS_IN_PROGRESS`; a changed redacted input returns
`IDEMPOTENCY_CONFLICT`. Failed/expired keys are terminal and require a new key for
a deliberate new attempt. A deleted result returns 404 on replay, without
refunding usage or recreating data. Rows retain only the input digest, metadata
and analysis reference, not an extra copy of logs. Do not prune these rows without
first defining a public idempotency retention policy. Account deletion cascades.

The browser retains an attempt key in memory across ambiguous network/storage
failures. A page reload does not retain that key. API clients should persist it
before sending and reuse it on ambiguous failure. Old clients without a key still
work, but cannot recover a lost response idempotently. Rate limiting remains
per-process and also applies to replay requests. Quota serialization is durable
across processes; provider charging is not an exactly-once external operation.

## Migration and release

Apply `database/migrations/003_analysis_reservations.sql` with the migration role
before enabling the new backend. It is additive, transactional and rerunnable;
existing history and monthly counters are not rewritten. Fresh Docker Compose
volumes apply it after init.sql; existing volumes require explicit migration.
The application intentionally fails before calling Gemini if the table is absent.

Validate on a restored staging database and take the normal backup before release.
Drain old analysis requests and replace old backend instances together: old quota
writers do not count reservations, so mixed versions must not accept analysis
traffic. Allow two minutes for abandoned reservations to expire. Avoid rolling
back to the unsafe admission implementation. If rollback is necessary, disable
analysis traffic first, retain the additive table, and diagnose before reopening.
Do not drop request records or reset usage to recover an error. No production
migration or deployment was performed as part of local validation.

## Logs and troubleshooting

Backend stdout is JSON Lines. Pretty-print locally with `jq .` if desired.
`X-Request-ID` is generated locally, returned to clients, and propagated with
AsyncLocalStorage. Inbound IDs are not trusted. HTTP records include method,
route template, status, duration and completion/disconnection. Query strings,
raw paths, bodies, email addresses, credentials and exception messages/stacks
are excluded. Logging uses an explicit field allowlist.

Events include `http_request`, `request_failed`, `provider_request`,
`database_pool_error`, `quota_transaction_failed`, `quota_release_failed`,
`quota_reserved`, `quota_consumed`, `quota_replayed`, `quota_released`,
`password_reset_delivery_failed` and authentication outcomes. Quota success events
are emitted after commit. Failure records distinguish expected rejections from
unexpected failures; known SQLSTATE codes help diagnose storage failures without
query parameters. Logs are operational metadata, not a permanent security audit.
Configure retention/access at the deployment log sink; no paid sink is introduced.

| Symptom | Inspect / response |
| --- | --- |
| 429 quota exceeded | Inspect used + reserved via account API; pending capacity expires in two minutes. Do not edit counters. |
| 409 in progress | Retry same key after current call finishes. Never create a new key for an ambiguous response loss. |
| 409 attempt failed | Correct the cause and intentionally start a new attempt with a new key. No usage was charged for the failed attempt. |
| AI 502 | Correlate request and provider events; distinguish invalid structured output from provider failure. Bounded transient retries; hard quota is not retried. Verify model availability/configuration in staging. |
| Storage 503 / SQLSTATE | Check database connectivity, TLS, migration 003, pool saturation and locks. Connection wait is 5s, statements 15s, quota lock wait 5s. |
| Quota release failure | Database outage may delay release; expiry bounds the capacity hold. Same-key replay determines whether completion committed. |
| Reset email missing | Inspect Brevo outcome and password-reset delivery event. Public recovery always returns the same 202 to avoid enumeration. Check sender/API configuration without printing secrets. |
| Elevated latency | Compare HTTP and provider durations by request ID. User row locks can also contend with password reset transactions. |

Gemini uses at most three attempts, a 20s per-attempt timeout, a 45s overall deadline and a 2048-token response cap. Exponential backoff and hard-quota handling are implemented in aiReliability.js.
Brevo uses a 10s abort timeout, one attempt, rejects redirects and discards response
bodies. Provider exceptions are mapped to safe application errors. Provider
response content, access keys and reset links are never logged. Brevo delivery
still occurs during the reset transaction; an outbox remains future work.

## Commercial release update (2026-09-30)

Apply migration 004 after 001–003 before deploying the new decision and billing
code to an existing database. Fresh Compose initialization includes 004.
Local Compose defaults the backend to development mode; set repository
`NODE_ENV=production` for a real deployment and configure exact `CORS_ORIGINS`,
an HTTPS `FRONTEND_URL`, trusted proxy hops and strong JWT/provider secrets.
The frontend Docker image now serves built assets through Nginx on 5173 with
same-origin `/api` proxying. An HTTPS ingress still has to be configured and
verified. Legal/contact links use the owner-supplied VITE_* build variables.

New sales are explicitly gated by `BILLING_ENABLED`. Leave false until the
commercial release checklist is completed. Existing billing customers must
retain Customer Portal access even when sales are disabled or price retrieval
fails. Configure Stripe webhook monitoring/replay, billing-failure emails,
provider project budgets and production backup/restore verification.

See docs/COMMERCIAL_RELEASE.md and docs/verification for current evidence and
blocking live-provider results. Historical readiness results elsewhere in this
file do not establish payment or production readiness for this release.

## Health and shutdown (2026-10-07)

`GET /health/live` checks process liveness; `GET /health/ready` checks connectivity and required schema with zero-row SELECTs. Readiness returns safe 503 on DB/auth/schema failure or shutdown, and does not call Gemini or Stripe. It is not evidence of provider availability or write privileges. Use readiness for Render/ingress health checks. Overlapping checks share a query; DB timeouts bound the probe.

SIGTERM/SIGINT stops accepting connections, makes readiness unavailable, drains admitted requests, then closes the pool. A 60s deadline forces failure exit; configure platform termination grace greater than 60s (Compose stop_grace_period: 70s). A forced termination leaves pending reservations to expire without consuming usage. Rollback must retain additive migrations and quota admission safety.

From backend, `node scripts/diagnose-database.cjs` diagnoses local connectivity read-only and prints safe status codes. Remote connections are refused unless an operator explicitly passes `--allow-remote` after authorizing that environment. DATABASE_URL takes precedence over DB_*; never print its value in support logs. SQLSTATE 28P01 means authentication failed, 3D000 means database absent; fix environment credentials/target rather than resetting data.

`--local` explicitly diagnoses DB_* without selecting the remote DATABASE_URL. This does not edit configuration. Production startup now validates HTTPS origins, Gemini/recovery credentials and sender, proxy hop values, and required Stripe settings when billing is enabled. The backend Docker image runs Node directly as the unprivileged node user; validate image/ingress behavior in staging before release.

## Current release controls — 2026-10-14

Use docs/PRODUCTION_READINESS.md for current evidence and launch gates; older reports are historical. `node scripts/release-check.cjs` runs local validation without deploying. Backend uses syntax validation and JavaScript runtime tests; frontend uses ESLint, TypeScript and a production build. CI now includes fixture validation, backend syntax, explicit frontend typecheck and dependency audits.

Migrations 004 and 005 are additive and transactional. A forward migration CLI records checksums and uses an advisory lock; review the backup and SQL before `cd backend && npm run migrate -- --apply`. Production Docker images do not include migration SQL; use a full repository checkout. See docs/DATABASE.md and docs/BACKUP_RESTORE.md. Never reset data or volumes to resolve migration failures.

Structured logs expose provider outcome/attempt/retry/latency, HTTP route/status/latency, DB SQLSTATE, auth rejections, quota failures and billing_webhook_failed. Fatal uncaught exceptions/rejections stop admission, drain and exit unsuccessfully for platform restart. Do not continue serving after an unexpected fatal exception. No external log sink or alert destination was configured in this session.

Recommended initial alerts (operator-configured, not verified SLAs): readiness unavailable for two consecutive checks; any failed backup or webhook repeatedly failing; provider success below 95% over 20+ attempts; provider auth/quota errors immediately; HTTP 5xx above 2% over five minutes with enough traffic; sustained connection/lock failures; quota_release_failed. At low volume, inspect every failed provider/billing request rather than relying solely on percentages. Derive AI success/failure from provider_request outcome; use durationMs for latency. Correlate by requestId and never paste log bodies into an alert.

Frontend ordinary requests expire after 30s; analysis requests after 65s. No automatic mutation retry is introduced. In-tab reload recovery stores only a digest and idempotency key in sessionStorage, never raw logs/context. Explicitly clearing the form starts a new attempt. Server-disconnected work remains bounded and recoverable with the original key. PDF/history display missing-information and verification fields; older records have explicit fallbacks.

Latest external checks: Gemini evaluation produced 28 provider failures and no validated analysis; configured database connection failed with 28P01; deployed Render readiness and billing-plans routes returned 404. Production rollout, recovery email and actual Stripe flow remain unverified. Fix credentials/configuration and deploy a reviewed SHA only after staging and backup/restore gates.
