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
| AI 502 | Correlate request and provider events; distinguish invalid structured output from provider failure. No automatic retries. Verify model availability/configuration in staging. |
| Storage 503 / SQLSTATE | Check database connectivity, TLS, migration 003, pool saturation and locks. Connection wait is 5s, statements 15s, quota lock wait 5s. |
| Quota release failure | Database outage may delay release; expiry bounds the capacity hold. Same-key replay determines whether completion committed. |
| Reset email missing | Inspect Brevo outcome and password-reset delivery event. Public recovery always returns the same 202 to avoid enumeration. Check sender/API configuration without printing secrets. |
| Elevated latency | Compare HTTP and provider durations by request ID. User row locks can also contend with password reset transactions. |

Gemini uses a 30s SDK request timeout, one attempt and a 4096-token response cap.
Brevo uses a 10s abort timeout, one attempt, rejects redirects and discards response
bodies. Provider exceptions are mapped to safe application errors. Provider
response content, access keys and reset links are never logged. Brevo delivery
still occurs during the reset transaction; an outbox remains future work.
