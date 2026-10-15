# Incident ingestion interfaces

Implemented PoC: `POST /api/integrations/render/events`, with an existing user's Bearer JWT. It accepts an explicit normalized envelope:

```json
{"type":"deploy_failed","eventId":"deploy_example_1","serviceName":"api","logs":"ERROR Missing required environment variable DATABASE_URL"}
```

The server validates event ID/service bounds, computes a namespaced idempotency key from eventId, marks Render context as caller-reported/unverified, and sends the log through the ordinary 16-KiB text validation, redaction, quota, AI contract and persistence pipeline. Ownership is the authenticated caller; event payloads cannot select a user. Same-user replay returns the same analysis; changing logs for an existing event conflicts. Different users are scoped independently. No arbitrary URL fetch occurs, so event-supplied URLs cannot create SSRF. Empty/binary/oversize input is rejected by the shared boundary.

This is a working API proof of concept with real SQL integration tests and a fixture provider. It is not a native Render webhook receiver, remote log collector, durable queue or verified Render-delivery integration. Do not give a long-lived browser JWT to an untrusted service. A production connector needs scoped, revocable integration credentials, documented provider signature verification, replay windows, event delivery monitoring and a reliable bounded context collector. The current JWT can expire or be revoked by logout/reset.

Future adapters for Vercel, Railway and GitHub Actions should normalize to `{source,eventId,occurredAt,service,environment,logs,context}` after verifying the provider and determining a server-side owner mapping. Use stable provider event IDs for retries; bound every fetched response, timeout and URL allowlist. Docker/CI can post bounded caller-supplied excerpts to the PoC pattern after proper authentication. Explicitly distinguish failed rollout from current production outage.

A future asynchronous pipeline can reserve an event, collect redacted context, enqueue bounded work, analyze, store evidence and mark terminal status. Introduce it only when measured latency/delivery requirements justify a queue. Optional GitHub Issues, Jira and Slack actions must use scoped credentials, destination ownership and an explicit human confirmation before posting. None of these external write actions were implemented or performed.
