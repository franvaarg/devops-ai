# Architecture

KANYI is an AI incident and troubleshooting assistant for small development teams without a dedicated DevOps/SRE engineer. Accounts are individual; shared workspaces and roles are not implemented.

React 19 + TypeScript + Vite builds a static frontend for Vercel or Nginx. This repository does not use Next.js. Express 5 runs as a long-lived Node process on Render or Docker. PostgreSQL owns users, password reset tokens, analyses, monthly usage, request reservations, billing-event deduplication and optional anonymous journey events. Gemini is the only implemented analysis adapter. Brevo sends password recovery mail. Stripe hosts checkout and account billing.

The browser stores a bearer JWT in localStorage. The server verifies HS256 and checks the current database token version on each protected request. Logout and password reset revoke all prior tokens. Each history/delete/account query is scoped to the authenticated user; request ownership never comes from an event payload. There is no browser session cookie, so cookie-based CSRF does not apply to these bearer endpoints. XSS remains a serious risk with localStorage sessions.

Analysis admission locks the user row, counts completed and pending work, then reserves a two-minute slot. The lock and database connection are released before the provider call. Completion locks the same user, saves analysis and increments quota atomically. Same-key replays return the existing result. Failed/expired keys are terminal; a new intentional attempt needs a new key. Unknown commit outcomes must be retried with the original key.

The UI keeps a SHA-256 digest and attempt key in sessionStorage, with no extra raw log/context copy, to recover ambiguous attempts across reloads within a tab. Clearing site data, a new tab, editing input, or explicitly clearing the form can lose that recovery context. API clients should persist keys themselves. This is not exactly-once billing by the external AI provider.

Input is bounded to 16 KiB of text plus 1,500 context characters, redacted before provider transmission/storage, then validated after generation. Observed evidence must be literal source excerpts. Missing information, verification steps, false-positive risk and root-cause confidence are separate fields. Causal truth and completeness are not mechanically proven.

Deployment events use authenticated adapters into this same pipeline. The Render PoC accepts caller-provided context; it does not collect remote logs, authenticate native Render webhooks or execute remediation. No Slack, Jira or issue messages are sent.

Use one backend instance initially: abuse limits and readiness coalescing are process-local. Durable database quotas work across processes. Do not scale horizontally without a shared rate-limit strategy and measured pool/provider capacity. No queue, cache or extra infrastructure is required for the current synchronous bounded workflow.
