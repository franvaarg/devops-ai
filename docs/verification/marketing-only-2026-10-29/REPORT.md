# Independent marketing launch preparation — 2026-10-29

Local implementation and verification only. No commit, push, release, publication, deployment, production setting, production credential, billing configuration, migration or intake enablement was performed. Existing uncommitted early-access implementation was preserved.

## Behavior and configuration

Public build environment:

```dotenv
VITE_MARKETING_ONLY=true
VITE_EARLY_ACCESS_ENABLED=false
VITE_API_BASE_URL=
```

The marketing wrapper renders Landing without mounting the existing product component or its session/reset hooks. Stale tokens are ignored and preserved; product session validation cannot replace this landing with a workspace connection-error screen. The form, sign-in, billing UI and analytics consent control are absent. Product events are suppressed even when a saved consent value is yes. The opening-soon section collects no input and offers no waiting list. The synthetic scenario/evidence interaction remains local. Product-processing descriptions are distinguished from the informational site's actual behavior. Public social copy directs visitors to the demo.

Outside marketing-only mode, the product component retains authentication, password reset, workspace and session-outage behavior. The public form now requires explicit frontend opt-in VITE_EARLY_ACCESS_ENABLED=true; backend EARLY_ACCESS_ENABLED=true remains separately necessary. Neither frontend switch changes server authorization. Backend startup validation and existing product/billing code were not changed in this step.

Publish only frontend/dist to approved static hosting after separate approval. No API service, PostgreSQL, Gemini, Stripe, email service or migrations are required for this mode. The existing Docker Nginx configuration still references a backend upstream; the independent deployment path is static hosting of dist, not full Compose or an unreviewed standalone use of that container.

## Test results

- Frontend ESLint and TypeScript project checks: **PASS**.
- Production builds: **PASS** for marketing-only (intake intentionally true, unreachable API), product/intake-closed, product/intake-open, and final marketing-only with the exact documented configuration. Final local marketing artifact is frontend/dist; no artifact was published.
- Built marketing browser checks: **PASS at 320, 390, 768, 1440px**, with zero page overflow, zero axe WCAG A/AA violations and **zero API requests**. Includes stale and clean sessions, old analytics consent, closed intake despite an accidentally true flag, keyboard skip link, reduced motion, dark preference, demo/evidence, navigation/back and auth/reset/billing-return URLs.
- Product mode with intake closed: **PASS**, including no form, sign-in/back, preserved session on HTTP 503 and expired-session clearing on HTTP 401.
- Explicitly enabled intake: **PASS**, including confirmed submission and the existing full form suite for validation, backend/network/malformed responses, rate limits, pending state, preserved values, duplicate-click protection, success focus and responsive layouts.
- Existing product journey: **PASS on desktop and mobile**, including registration, returning login/logout, workspace analysis/context/history, actual valid PDF downloads, deletion, quota, billing/provider errors, pending/paid/canceled UI, reset and session recovery. Provider/payment/email responses are explicit HTTP fixtures.
- Existing analysis resilience suite: **PASS**, including malformed-response rejection, timeout, duplicate analysis clicks and same-key retry recovery.
- Exact documented final marketing artifact: **PASS** in a separate local smoke check with stale token, saved analytics consent and no working APIs.
- JavaScript browser-script syntax checks and git diff --check: **PASS**.

No backend source changed in this follow-up; backend/SQL suites were not rerun. Previous Phase 2 backend results remain historical evidence, not fresh production verification. Browser checks used local Chromium and built files on Node v24.21.0, not real devices or a deployed host. Axe results are not an accessibility certification.

## Verification evidence

- [Public mode and configuration checks](public-modes.json)
- [Intake form regression](intake-regression.json)
- [Existing product journey](product-journey.json)
- [Analysis resilience](analysis-resilience.json)
- [Exact documented marketing build smoke test](exact-build-smoke.json)
- [Desktop hero](hero-desktop.png)
- [390px page](marketing-390.png)

The browser runner serves production build artifacts on temporary loopback ports and blocks external/API requests in marketing checks. Three builds exercise marketing-only with an accidentally true intake flag/unreachable API, product mode with intake closed, and product mode with intake enabled. A separate smoke test verifies the final frontend/dist build with the exact recommended public configuration. No real services are contacted.

The first form-regression run exposed a timing race in an existing test that asserted focus immediately after seeing the success heading, before the component's scheduled animation frame. The test now waits for success focus. No product focus implementation was changed.

## Changed-file manifest for this step

- frontend/src/config/publicMode.ts — new build-time mode/availability switches.
- frontend/src/App.tsx — marketing wrapper bypasses mounting product hooks.
- frontend/src/pages/Landing.tsx — availability-aware CTAs, opening-soon section, FAQ and data-handling context; no sign-in in public mode.
- frontend/src/components/ProductFooter.tsx — accurate informational-site disclosure and no marketing analytics control.
- frontend/src/services/api.ts — marketing event suppression.
- frontend/.env.example — explicit public flags and safe defaults.
- frontend/Dockerfile — build-argument passthrough; no live configuration changes.
- frontend/index.html — accurate demo-focused metadata.
- frontend/public/social-preview.svg and social-preview.png — demo-focused social asset.
- frontend/scripts/verify-public-modes.cjs — new built-artifact mode/outage/session/navigation/accessibility tests and optional existing regressions.
- frontend/scripts/verify-landing.cjs — wait for scheduled success focus.
- README.md — static build instructions and independence/limits.
- docs/EARLY_ACCESS.md — mode matrix, exact configuration, coordinated intake enablement and proposed deployment checklist.
- docs/verification/marketing-only-2026-10-29/* — local evidence and this report.

Earlier Phase 2 backend/schema/landing changes remain in the working tree; the manifest above identifies this follow-up's additions/edits. No backend source or production settings were changed by this follow-up.

## Remaining public-launch gates

Supply and approve the actual operator identity, monitored contact and privacy/terms information; review hosting logs, local preferences, any host analytics, retention and rights handling. Confirm a separate marketing hostname, HTTPS/static host, routing, header delivery and separation from product auth/reset URLs. Set approved public disclosure values at build time. Configure absolute social image URLs and canonical/og:url only after the real origin is approved. Review the exact artifact and obtain deployment approval. No deployed-host verification is claimed.

Lead retention, real SQL intake and product/provider/payment gates remain closed for their later stages. See [the marketing deployment checklist](../../EARLY_ACCESS.md#proposed-marketing-deployment-checklist--requires-explicit-approval).
