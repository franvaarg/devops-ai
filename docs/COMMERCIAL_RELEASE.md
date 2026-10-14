> Latest verification (2026-10-07): see [the transformation readiness report](TRANSFORMATION_READINESS.md) and [current evidence](verification/2026-10-07/summary.json). Earlier results below remain historical and do not establish current commercial readiness.

# KANYI commercial release gate — 2026-09-30

**Charging a customer today remains blocked.** Stabilization reran eight real synthetic incident analyses on the configured Gemini 3.6 model: round 1 passed 3/4; round 2 passed 1/4 before three non-retryable daily quota failures. Bounded retries did not eliminate a timeout/503 failure. A separate raw provider probe verified the project's Free-tier daily limit of 20 requests. Real Stripe TEST MODE payment and lifecycle verification have not occurred; test credentials are absent and the AI prerequisite remains unresolved. `BILLING_ENABLED=false` keeps sales disabled.

## Product and commercial decisions

KANYI turns noisy log excerpts into prioritized incident intelligence. The recurring utility is a consistent decision contract plus searchable history and exports, rather than an unconstrained chat box. New assessments separate actionability, severity, confidence and false-positive risk; source excerpts must match the submitted log. Operational context is explicitly user-reported, not evidence. A legacy warning or an ERROR label alone is not sufficient to assert an outage. No claim is made that KANYI outperforms a general assistant in diagnosis accuracy: that requires evaluation with representative customer logs.

Free: 50 successful analyses per UTC calendar month. Pro: 500 successful analyses per UTC calendar month. Both include the complete decision format, history, PDF export and deletion. Both accept text excerpts up to 16 KiB plus 1,500 characters of context. Failures do not consume quota. An active subscription increases recurring capacity; it does not buy higher confidence or a different truth standard. Team is explicitly planned and not purchasable. Quotas do not roll over and are distinct from subscription billing periods.

### Price proposal, not a configured selling price

Consider **USD $29/month for Pro** as an initial hypothesis, subject to the owner accepting the cost model and testing willingness to pay. The application displays the actual active monthly USD price retrieved from Stripe, never this proposal. Only monthly licensed per-unit USD prices are accepted, preventing interval/currency surprises.

Google's [published Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) checked on 2026-09-30 lists `gemini-3.6-flash` standard input/output rates of $0.75/$3.75 per million tokens through December 2026 and $1.50/$7.50 from January 2027. Output includes thinking tokens. Recheck these rates when configuring the selling price or changing models.

Assumptions, not observed production costs:

| Scenario | Input tokens including instructions/context | Output/thinking tokens | Cost/analysis through Dec | Cost/analysis Jan onward | 500 uses Jan onward |
| --- | ---: | ---: | ---: | ---: | ---: |
| Typical excerpt | 2,500 | 900 | $0.00525 | $0.01050 | $5.25 |
| Conservative near-limit example | 18,500 | 2,048 | $0.02156 | $0.04311 | $21.56 |

Bytes are not a universal token estimate: the second row is a planning allowance, not a proven hard token bound. Supported Gemini 3.6/3.7/3.8 Flash calls now request LOW thinking effort to reduce latency and reasoning consumption, following [Google’s documented thinking controls](https://ai.google.dev/gemini-api/docs/thinking). The response is capped at 2,048 tokens; truncation can fail validation and must be included in quality/cost evaluation. Provider retry attempts are bounded. Do not assume failed calls are free from Google. No search grounding or extra tools are enabled.

At $29 and typical full usage after January, AI leaves roughly $23.75 before payment/Billing fees, database/hosting, support, taxes, refunds and free users. Near-limit full usage leaves only $7.44. A Free account at 50 typical uses costs roughly $0.53 after January, before overhead. An illustrative 10 Free accounts per paying account adds $5.25 to acquisition/serving costs. These are hypotheses, not measured margins. Successful provider responses now log only numeric input/output/thinking token counts (`analysis_tokens`), including responses that later fail contract validation; no log content or provider payload is logged. Failed calls with no usage metadata still require reconciliation against the provider billing console. Measure this usage and failed provider costs in a paid-project pilot before enabling sales; reduce capacity or increase price if the mix is unfavorable. Account creation abuse can multiply the free cost. Existing authentication/analyze rate limits do not replace email verification or a provider budget alert.

## Implemented customer journey

| Stage | Delivered behavior | Verification boundary |
| --- | --- | --- |
| Discovery | Public hero, outcome copy, synthetic example, differentiators, how it works, FAQ, Free/Pro/Team pricing | Desktop/mobile rendering and CTA checked with browser fixtures |
| Signup / first value | Existing real registration/login; sample logs; optional context; privacy disclosure | Real SQL/API signup/login/analysis flow tested; Gemini replaced in integration tests |
| Useful result | Four decision labels, summary, source excerpts, probable cause, ordered checks, noise explanation | Strict contract tests; decision persistence and isolation in PostgreSQL |
| Return / retention | Searchable history with cursor pagination, severity filters, details, PDF export, per-analysis deletion | Existing SQL/API boundaries and browser display; export includes decision and uncertainty |
| Limits / upgrade | Visible used/remaining counts; server atomic quota gate; configured price; quota state | Concurrent last-slot reservation and replay tests; desktop/mobile UI fixtures |
| Payment / subscription | Stripe hosted Checkout, raw-body verified webhooks, server current-state retrieval, portal | Genuine SDK test signatures + real SQL; Stripe API network replaced in tests |
| Paid access / cancellation | Server-owned Pro status; period expiration; past-due/free fallback; period-end cancellation display | SQL lifecycle tests and UI fixtures; live Stripe not verified |
| Failures | Safe provider/storage/billing errors, oversized/binary input rejection; sessions retained on service outage | Unit/API/SQL and browser checks; no error response exposes provider payloads or stacks |

No fake logos, customers, testimonials, certifications or usage statistics were added. The landing example and onboarding logs are labeled/safe synthetic examples. Removed vanity severity charts from the main customer flow and lazy-loaded the workspace and PDF renderer.

## Billing architecture and exact owner setup

1. Confirm the legal entity and payment-provider eligibility. Stripe supports only its [listed business countries](https://stripe.com/global); Costa Rica was not listed when checked. A Costa Rica timezone does not establish the business's country. Do not create an account using invented residency. If the entity is unsupported, select an eligible provider or merchant of record and adapt the integration before launch.
2. Create/verify a Stripe business account and product with one monthly USD Pro price. Decide the price, tax treatment, refunds and cancellation policy. This implementation has no automatic Stripe Tax configuration; configure required taxes before selling in applicable jurisdictions.
3. In backend secrets, configure `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, and `FRONTEND_URL`. Keep credentials in the hosting secret store, not source control or chat. Use test-mode credentials first. `BILLING_ENABLED=true` exposes purchasable Pro; leave it false until validation is complete.
4. Register `POST https://<api-domain>/api/billing/webhook`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, and `invoice.payment_failed`. Set the destination signing secret. Events that reference subscriptions retrieve current Stripe state under an account lock, rather than trusting stale payloads. Unknown customer mappings return a failure for provider retry. Completed event IDs are persisted transactionally.
5. Configure Stripe Customer Portal for cancellation, payment method changes and invoice access. Limit its catalog to the supported Pro product/price. Downgrade to Free is cancellation; Team and additional prices are unsupported. Test cancellation both immediate and at period end. Portal remains callable for existing billing customers when new sales are disabled.
6. Configure Stripe retries/payment-failure emails, customer receipts, and owner alerts for disputes/refunds. The application does not automate refund/dispute business decisions. Determine policy and operational ownership before launch.
7. Complete test-mode checkout, verification-required/declined payment, delayed payment, duplicate checkout retry, activation, invoice failure/recovery, immediate and period-end cancellation, portal access, and expired billing periods. Save IDs and entitlement evidence. Redirect query strings do not activate Pro.
8. After production deployment, complete an owner-authorized real purchase and cancellation/refund with live credentials. Confirm actual charged amount, currency/tax, receipt, verified webhook, account quota and portal. This has not been performed.

API: `GET /api/billing/plans` is public. Authenticated `POST /api/billing/checkout` and `/portal` take no trusted plan/customer identifiers from the frontend. The server owns these mappings. Checkout serializes account attempts, checks existing subscriptions, reuses saved open sessions, and recovers still-open provider sessions after a storage failure. Only the configured price, one unit, active/trialing status, no payment-collection pause and an unexpired period grant Pro. Existing legacy manually assigned Pro rows remain compatible; review and remove any unverified legacy paid grants before launch.

## Privacy, trust and legal owner actions

The frontend discloses Gemini transmission and best-effort credential redaction before submission. New log/context inputs are redacted before the provider and saved result. Redaction is not comprehensive: users must remove personal data and secrets. Literal evidence validation proves an excerpt exists, not that the diagnosis is correct. Confidence and false-positive risk are qualitative, uncalibrated model assessments.

Stripe receives the account email and subscription metadata when checkout is started; hosted Stripe pages collect payment details. KANYI does not collect card numbers.

Analyses remain in PostgreSQL until the user deletes them. Deletion removes the live analysis row (including stored log and context); it does not refund consumed quota. The idempotency/usage records remain to prevent duplicate charging. Backups and provider-side retention are separate. Existing older stored logs are not retroactively redacted by this release. Review legacy data before public launch.

The owner must supply the legal operator name, support contact, domain, terms, privacy policy and refund policy; publish links in the signup and footer. Set frontend build variables `VITE_LEGAL_NAME`, `VITE_SUPPORT_EMAIL`, `VITE_PRIVACY_URL`, and `VITE_TERMS_URL` to the real information. Docker Compose forwards these non-secret build values from its environment. Empty variables create no fake/dead links. Establish retention/deletion times for backups, providers, accounts and billing records; access roles, breach-response contacts, and deletion-request handling. These cannot be truthfully invented in code. The current FAQ is a technical disclosure, not a complete privacy policy or legal terms.

Use a paid Gemini project appropriate for customer log data. Google's pricing page distinguishes free/paid data-use terms. The product does not promise no training, GDPR compliance, certifications or end-to-end encryption. Verify the exact provider contract, region and retention for the chosen project before accepting confidential production logs. HTTPS, database backups/restoration and hosted database isolation still require deployment verification. JWTs remain in browser local storage (existing architecture); no cookie-session migration was performed.

Product events are allowlisted; client journey events are opt-in and contain only the event name (no log, context, email, tracking identifier, or ad cookies). First/second successful analysis milestones are counted server-side using completed idempotency requests when the client opts in. Subscription activation is an anonymous operational aggregate independent of optional browser analytics. HTTP anti-abuse/hosting may process IPs; do not promise that infrastructure collects none. Optional consent can be revoked in the landing footer. Funnel event counts are directional: anonymous events cannot attribute a visitor-to-account conversion or prevent forged anonymous counts. No invasive session replay/tracker was installed.

## Deploy, verify and roll back

- Back up the database and apply migrations 001–004 in order on an existing database. Migration 004 is idempotent. Docker fresh initialization includes 003 and 004 after the current init schema. Existing Docker volumes do not rerun init scripts.
- Deploy the backend with production `CORS_ORIGINS`, an HTTPS `FRONTEND_URL`, strong `JWT_SECRET`, verified database configuration, a paid Gemini key/model, password-reset email sender, proxy hop count, and billing secrets. Production startup refuses missing origin/HTTPS frontend configuration.
- Frontend Docker now builds static assets and uses Nginx on 5173, with same-origin `/api` proxying. Separate hosting sets `VITE_API_BASE_URL` at build time. Put HTTPS at the trusted ingress; verify direct backend exposure/proxy headers and CORS in production.
- Configure uptime, provider/DB failures, webhook failures and billing discrepancy alerts. Period expiry prevents indefinitely retaining Pro after missed events but does not reconcile a renewal automatically if all provider deliveries fail: use Stripe event replay and investigate failed notifications. Configure operator access and on-call ownership.
- Smoke-test password recovery and account isolation in the deployed environment; verify backup restore. This release did not build or deploy Docker images or verify a production host.
- Keep old code for rollback; additive migration columns can remain. Disable new sales with `BILLING_ENABLED=false` on incidents; existing customers can still reach their portal. Do not roll back to a backend without verified entitlements while accepting payments.

## Evidence and remaining release blockers

102 local unit/API tests and 21 real ephemeral PostgreSQL tests cover auth, quotas, replay, redaction, strict decisions, account isolation, billing duplicate/stale events, mismatched customers, raw signed/forged/tampered webhooks, session reuse and sales-disabled portal access. Frontend build/lint are checked. Browser fixtures at 1440×1000 and 390×844 exercise the landing, signup, sample, result, history, usage, upload rejection and provider/billing errors. Additional checks cover quota messaging, pending checkout, paid/cancellation display, portal availability during a price failure, and retaining auth on a service outage. Real PDF downloads were generated and their text inspected. Keyboard focus was exercised; axe WCAG 2 A/AA and 2.1 AA checks reported no violations on landing, signup, expanded results, and dark-theme results at both sizes. These checks are not a certification or a complete assistive-technology audit. Browser network fixtures are not an end-to-end real purchase.

**READY (locally verified):** commercial product explanation, initial incident workflow, source-backed contract, history/deletion/export implementation, backend quotas, Stripe integration boundaries, honest limits and failure states.

**OWNER ACTION REQUIRED:** eligible billing business/account, actual Stripe price and credentials, portal/tax settings, paid AI account and budgets, domain/TLS/email, legal/support details, policies, deployment and production monitoring/backup configuration.

**NOT READY FOR CHARGING:** no live/test Stripe network lifecycle verification with owner account; live provider reliability failed (details below); no deployed quality pilot on representative customer logs; no final legal/support links; no deployment/restore/monitoring evidence. Free-account abuse and adverse maximum-log economics need a pilot/budget decision. Do not claim commercial readiness on the strength of mocked UI/provider tests alone.

### Actual provider and verification evidence

Live evaluation used safe synthetic logs only, with no database writes. The existing credential successfully listed models; it was not rejected by the list endpoint. `gemini-3.6-flash` failed all four generation cases; status-only diagnostics confirmed HTTP 503 for a generation request. The listed `gemini-2.5-flash` alternative failed all four cases and its generation diagnostic returned HTTP 404. `gemini-3.7-flash` returned a valid source-backed assessment for recovered legacy warnings (Low severity, Likely Noise, High false-positive risk), but the supported-impact, insufficient-context, and instruction-injection cases failed; the last timed out at the configured 30-second boundary. One valid result does not establish reliable operation or calibrated false-positive accuracy. That recovered-noise result also assigned High confidence while hypothesizing a latency spike not directly shown by the log. The prompt was tightened afterward to define confidence as confidence in the probable cause, with High reserved for direct causal evidence. That refinement still needs live validation; the stored report records the original observation. No default model was changed based on these mixed results.

A follow-up Gemini 3.7 Flash evaluation with LOW thinking and the tighter confidence prompt also failed all four cases: three generation requests logged HTTP 503 and one reached the 30-second timeout. Lower reasoning effort did not establish reliability. No additional live retries were used to hide these failures.

Before charging, configure a provider/model that passes this live evaluation reliably, validate latency and truncation, and run a paid-project pilot on representative logs. The owner's current project tier/region and provider availability are not established by a model listing. Do not assume all failure causes share one explanation.

Reproduce: `node scripts/provider-preflight.cjs` lists available models; add `--analysis` for one synthetic request with safe status-only diagnostics. `node scripts/evaluate-incidents.cjs --live` evaluates four synthetic cases and writes a safe report. `GEMINI_MODEL` may select an alternative for evaluation without editing credentials. These commands send no customer logs and never write to the application database.

Versioned reports are in `docs/verification/`. Live reports document failures rather than hiding them. Browser reports are explicitly fixture-based. Successful local checks do not replace live payment/deployment gates.


## Commercial stabilization evidence — 2026-09-30 Costa Rica / 2026-10-01 UTC

No product features or redesign were added in this phase. Reliability changes and release evidence only. Historical evaluation reports above remain failures; they have not been replaced or counted as passing.

### Investigation findings

| Candidate cause | Evidence and conclusion |
| --- | --- |
| Model availability/deprecation | The current `gemini-3.6-flash` and alternate `gemini-3.7-flash` both generated plain and schema-constrained responses in six tiny probes. Their unavailability is not permanent. Gemini 2.5 returned HTTP 404 `NOT_FOUND` twice; listing a model does not establish generation access. No automatic model fallback was added. |
| Key/API configuration | The existing key supports real 3.6 and 3.7 generation. No Gemini base-URL override or HTTP/HTTPS proxy environment setting was configured. Successful generation does not establish the project's commercial billing capacity. |
| Quota/rate limiting | Round 2 returned three HTTP 429 `RESOURCE_EXHAUSTED` errors with hard-quota details and was not retried. A subsequent tiny raw SDK request confirmed `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, value `20`. This verifies a daily Free-tier quota blocker, not a transient per-minute throttle. It does not prove the earlier HTTP 503 errors were quota errors. |
| Provider behavior | Round 1's recovered-noise case timed out, then returned HTTP 503 on both retry attempts. Other cases succeeded. The provider/transport boundary is intermittently failing. Historical 503 responses were not retained with full reason details, so the precise capacity/outage cause cannot be reconstructed honestly. Google documents 503 as service unavailable; overload is a possible explanation, not a proven account-specific cause. |
| Timeout/network | A fresh preflight reached the old 30-second timeout (`AbortError`); a live stabilized attempt reached the new 20-second attempt deadline. Cancellation is verified locally. Provider work exceeding the deadline is observable; its underlying cause is not established. There is no evidence of DNS or connection failure in these live reports. |
| Request/prompt size and malformed request | Tiny plain/schema requests succeeded, and full incident requests succeeded with 498–577 input tokens and 227–319 output tokens in round 1. Identical contract/prompt configuration can succeed. There were no HTTP 400 malformed-request errors in these runs. A size-specific failure is not demonstrated, and near-limit customer logs have not been live-validated. |
| Retry configuration | Installed SDK 2.10.0 `apiCall` reads retry options from client `httpOptions`, while the old code supplied them per request. Those per-request retry settings did not control retries. The application now explicitly owns retries, with SDK client retries absent. |
| Application error handling | Provider status previously disappeared after safe wrapping. Each attempt now records safe status, classification, retryability, attempt and delay with the same application request ID; raw provider bodies, log text, keys and URLs are excluded. Missing credentials no longer crash service import. Failed analyses release their reservation and never persist a result or consume monthly quota. |

References: [Google GenerateContent API errors](https://ai.google.dev/gemini-api/docs/generate-content/api-errors), [Google troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting). Documentation explains status semantics; only the stored live reports establish what this project returned.

### Reliability implementation and limits

`backend/src/services/aiReliability.js` caps generation at three attempts, 20 seconds per attempt, and a 45-second overall deadline. The final attempt's timeout shrinks to fit the remaining budget. This leaves headroom for quota/database operations beneath the Nginx 60-second proxy timeout and the 120-second quota reservation. Transport cancellation uses AbortSignal plus the SDK HTTP timeout; an independent timer bounds the application wait. Backoff starts at 500 milliseconds, doubles, and adds 0–249 milliseconds jitter. Google RetryInfo delays are honored only when they fit the deadline. Delayed backoff cannot start another attempt after the deadline.

Only HTTP 500/502/503/504, transient 429, recognized transient network errors and timeouts can retry. Daily/monthly or zero quota never retries, even with RetryInfo. HTTP 400/401/402/403/404/422, unknown errors, and invalid analysis contracts are not blindly retried. JSON/schema validation remains outside generation retries: invalid content is rejected rather than presented as an assessment. Retries can incur additional provider cost; this must be included in the paid project's budget and pricing validation.

Customers receive a safe error explaining that an unsuccessful analysis did not use their allowance, plus the existing request ID. No internal error body or stack trace is returned. An authenticated API regression verifies repeated failures still return controlled responses, release reservations, and preserve distinct request IDs across HTTP requests.

### Repeated live results

- `provider-diagnostic-stabilization.json`: four successful tiny requests across 3.6/3.7; two 2.5 HTTP 404 failures.
- `gemini-stabilization-round-1.json`: **3/4 passed**. The failed recovered-noise case used all three attempts: timeout, HTTP 503, HTTP 503. Supported impact, insufficient context, and injection cases returned validated source-backed results. Their durations were about 2.7, 14.5 and 7.6 seconds.
- `gemini-stabilization-round-2.json` and `.log`: **1/4 passed**. Recovered noise passed; the remaining three cases returned daily hard-quota 429 on their first attempt, with no retries. Each report includes application request IDs.
- `provider-quota-stabilization.json`: one minimal raw request confirms the daily Free-tier cap of 20. Further requests against the exhausted configured-model quota were stopped.

The recorded live rounds used an initial 55-second total generation budget. The final code tightens this to 45 seconds to reserve time for database operations under the 60-second proxy timeout; all observed round-1 outcomes occurred within 24 seconds. Final-budget live verification remains pending the exhausted quota.

**AI reliability is NOT RESOLVED.** Four of eight incident evaluations passed. Neither isolated success nor mocked retry recovery counts as resolution. After project capacity is available, repeat both complete four-case rounds, retaining all outcomes/attempts, and verify latency and representative log-size behavior. Reproduction from `backend`: `node scripts/diagnose-provider.cjs` for six tiny probes, `node scripts/diagnose-provider.cjs --configured` for one quota probe, and `node scripts/evaluate-incidents.cjs --live` for each four-case round. These use synthetic data only and never write application database records. Save `/tmp/kanyi-live-evaluation.json` between rounds to avoid overwriting evidence.

### Stripe TEST MODE and deployment gate

Safe environment inspection found billing disabled, no `sk_test_` secret key, no configured price, and no webhook signing secret. No real checkout, test payment, provider-delivered verified webhook, Pro activation/entitlement enforcement, portal session or cancellation was performed. Existing signed-fixture integration tests are regression coverage only, not real Stripe E2E evidence. This remains pending the explicit AI reliability prerequisite.

Once AI passes, the owner must configure an isolated test deployment/database, Stripe TEST MODE secret key, an active monthly licensed per-unit USD price, a real webhook endpoint and its signing secret, `FRONTEND_URL`, and portal cancellation settings; enable billing in that test deployment. Configure secrets in the backend environment/secret store, not in chat or source control. Then use a genuine Free test account to reach its limit, complete hosted Stripe checkout with a test card, verify the provider-delivered webhook and persisted subscription/Pro entitlements, open the real portal, cancel, and verify both scheduled cancellation and loss of Pro at subscription termination. No frontend flag, locally forged event, or mocked Stripe response can satisfy that gate.

Deployment remains NOT READY: AI reliability and real Stripe E2E are open, and production domain/TLS, owner legal/support details, accepted selling price, operations/restore/monitoring evidence remain unverified. No deployment or sale was attempted in this phase.


Final regression verification: **102/102 backend unit/API tests and 21/21 real ephemeral PostgreSQL integration tests passed**. Retry tests cover 429, 500/502/503/504 recovery, permanent client errors, hard quota, RetryInfo delays, timeout cancellation and recovery, shrinking overall budgets, delayed backoff, malformed-response rejection, request correlation, and missing credentials. These local results verify application protections; they do not resolve provider availability or replace the required real Stripe lifecycle.
