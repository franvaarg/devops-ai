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
