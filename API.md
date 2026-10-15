# API operational contract

Existing `/api/auth`, `/api/account`, `/api/analyze` and `/api/history` paths remain
compatible. Successful response fields are preserved. Account usage adds
`reserved`; `remaining` excludes both successful usage and active reservations.

Error responses retain a top-level `message` and add:

```json
{
  "message": "Data storage is temporarily unavailable.",
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Data storage is temporarily unavailable.",
    "requestId": "a-server-generated-uuid"
  }
}
```

All responses expose `X-Request-ID`. Error codes cover validation, authentication,
forbidden access, missing resources, rate limits, quota exhaustion, database,
AI, email and internal failures. Unexpected exceptions never expose their text.
Password recovery deliberately keeps its generic 202 even if delivery fails.

## Analysis retries

Send `Idempotency-Key: <UUID>` on `POST /api/analyze` with the existing Bearer token
and `{ "log": "..." }` body. Keys accept 16–128 ASCII letters, numbers, `_` or `-`.
The response echoes the key, exposed through CORS along with the request ID.
Without a key, the server generates one for backward compatibility.

| Result | Meaning / client behavior |
| --- | --- |
| 201 | Saved result, or replay of the same completed request. |
| 409 ANALYSIS_IN_PROGRESS | Keep the same key; retry later. |
| 409 IDEMPOTENCY_CONFLICT | Key used with different redacted input. Use a new key for a different operation. |
| 409 ANALYSIS_ATTEMPT_FAILED | Prior attempt failed/expired. A deliberate retry needs a new key. |
| 429 QUOTA_EXCEEDED | No capacity; no AI call started. |
| 429 RATE_LIMITED | Wait; preserve the attempt key. |
| 502 AI_PROVIDER_ERROR / AI_INVALID_RESPONSE | Attempt failed; reservation released or expires. New attempt needs a new key. |
| 503 DATABASE_ERROR / transport failure | Outcome may be ambiguous. Retry with the same key. |
| 404 RESOURCE_NOT_FOUND on replay | Result was deleted. No new analysis or charge is created. |

Persist the key before sending if retries must survive client restarts. Do not
blindly retry a POST with a fresh key. See OPERATIONS.md for the billing point,
expiry and migration rollout requirements.

## Commercial product additions

`POST /api/analyze` accepts `log` (text, at most 16,384 UTF-8 bytes), optional
`context` (at most 1,500 characters), and optional `analytics` (boolean, default
false). Log and context are redacted before transmission. Context is
user-reported and is not accepted as literal log evidence. New results include
`actionability` (`Action Required`, `Investigate`, `Likely Noise`),
`falsePositiveRisk` (`Low`, `Medium`, `High`), `noiseAssessment`, and saved
`operationalContext`, alongside the existing severity/evidence/diagnosis fields.
No-evidence responses force Low confidence, Investigate, and High
false-positive risk. Missing/partial decision fields from the provider are
rejected. Old stored results have no decision fields and must show Not assessed.

Idempotency keys cover the redacted context as well as the log. Empty-context
requests preserve the previous log-only hash and can replay pre-release results.
Changing context with the same key is a conflict. Deleting history does not
refund usage or permit replay of a deleted result.

`GET /api/history` supports `beforeId` for older pages, alongside search,
severity and limit. The cursor must be a positive 32-bit integer. Results are
ordered by descending ID and scoped to the authenticated account.

`GET /api/account` adds `hasBillingCustomer` (boolean only) and
`cancelAtPeriodEnd`. Usage reflects effective entitlements; an expired paid
period or a non-active subscription falls back to Free, without deleting history.
Provider IDs remain server-side.

- `GET /api/billing/plans`: public limits, actual configured monthly USD price,
  and availability. With sales disabled, pricing is null and available is false.
- `POST /api/billing/checkout`: authenticated; server determines price and customer.
  Returns a Stripe-hosted URL. Reuses an open checkout and rejects an existing
  subscription. Does not activate Pro.
- `POST /api/billing/portal`: authenticated; returns the owner's configured Stripe
  Customer Portal. Remains callable for existing customers when sales are disabled.
- `POST /api/billing/webhook`: Stripe signature over the raw body is required.
  Current subscription state is retrieved and persisted transactionally with
  duplicate event protection. Browser success URLs never grant an entitlement.
- `POST /api/events`: opt-in anonymous client telemetry. Accepts only an
  allowlisted `event` name, with no arbitrary properties. First/second successful
  analysis milestones are recorded atomically on opted-in analysis calls.

New safe errors include LOG_INVALID, BILLING_UNAVAILABLE, BILLING_ERROR,
BILLING_SIGNATURE_INVALID and SUBSCRIPTION_EXISTS. See the commercial release
report for exact billing configuration and unverified live-provider gates.

## Operational endpoints and session revocation

`GET /health/live` returns 200 for process liveness. `GET /health/ready` returns 200 only for reachable required DB/schema; 503 while draining or unavailable. Neither probe calls AI/payment providers. `POST /api/auth/logout` requires Bearer auth and returns 204 after revoking all account tokens.

New decision outputs can use `Insufficient Evidence` when no observed evidence is available, with Low severity and confidence. Optional `inputSignals` records deterministic line/duplicate and timezone-timestamp counts at submission; it is not live monitoring. Older analyses omit it.

## Production-hardening additions (2026-10-14)

Authenticated `POST /api/integrations/render/events` accepts `{type:"deploy_failed",eventId,serviceName,logs}`. It derives an account-scoped Render idempotency key and uses the existing analysis/quota/store flow. This is caller-fed event ingestion, not a verified native webhook or remote log fetch. See docs/INCIDENT_INTEGRATIONS.md.

Authenticated `DELETE /api/account` requires JSON `{password}`. A correct current password deletes a non-billing account and its live history/reset/request/usage data, returning 204. Wrong credentials return 401. Accounts with Stripe customer records return 409 `ACCOUNT_SUBSCRIPTION_ACTIVE` and require support; they are not silently detached from billing. Backup/provider retention is separate.

New analyses return and persist `missingInformation: string[]`, `verificationSteps: string[]`, and `providerMetadata: {provider,model,latencyMs}`. Old history may omit these fields. Evidence must remain a literal redacted-log excerpt; context is unverified and not observed evidence. Confidence is qualitative.

Provider errors distinguish AI_AUTH, AI_RATE_LIMITED, AI_QUOTA_CONFIGURATION, AI_TIMEOUT, AI_NETWORK, AI_REQUEST_REJECTED, AI_INVALID_RESPONSE and AI_PROVIDER_UNAVAILABLE. API responses carry X-Request-ID and Cache-Control: no-store; errors include their correlation ID. Rate-limit failures use JSON, including billing and event routes.

History accepts only severity, search, limit and beforeId. Severity is Low/Medium/High/Critical; search is at most 200 characters; limit is an integer 1–100. beforeId must be a positive PostgreSQL integer. Unknown/malformed query parameters return 400. All history and deletion ownership remains server-side.
