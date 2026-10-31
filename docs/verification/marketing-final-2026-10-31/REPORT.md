# KANYI free marketing demo finalization — 2026-10-31

## Implementation

Marketing mode renders only the public landing. Unsupported paths, query strings (including reset tokens and billing returns), and unknown/auth fragments normalize to `/`, preserving supported public anchors. Hash and popstate listeners cover back/forward navigation. Product session hooks never mount and stale stored tokens remain ignored and preserved. ProductApp was extracted without behavioral changes and is loaded only in product mode.

The shared API request function rejects every product/auth/registration/reset/billing/intake call in marketing mode before fetch. Analytics remains suppressed regardless of stored consent. No login, registration, billing navigation, payment collection, uploads, or lead forms are exposed. Early access stays closed with “Early access opening soon”. The workflow and FAQ now describe the free local synthetic experience explicitly. All three scenarios retain severity, confidence, recommendations and inspectable evidence.

Vercel's repository build command forces `VITE_MARKETING_ONLY=true`, `VITE_EARLY_ACCESS_ENABLED=false`, and an empty `VITE_API_BASE_URL` only for Preview deployments of `review/kanyi-marketing-only-2026-10-29`. Production and other branches inherit their existing settings. The build environment regression covers this boundary. No hosted environment variable, credential, backend, Stripe, Gemini, or intake setting was changed.

## Validation

- ESLint, TypeScript checks, production marketing/product/intake builds: passed.
- API isolation: every exported request entry point, both Checkout and portal, plus analytics made zero fetch/navigation calls in marketing mode. Product login still calls its API.
- Built-artifact Chromium checks at 320, 390, 768, 1440px: passed with zero external/API requests, page errors, horizontal overflow, or axe WCAG A/AA violations. Includes keyboard skip link and reduced motion.
- All three demo scenarios: correct severity, confidence, recommendation, and evidence copied from the selected log.
- Auth/register/forgot/reset/dashboard/history/account/billing/pricing/unknown routes: return to the landing and remain public on refresh. Hash, back and forward checks passed with stale and clean sessions.
- Existing product mode regressions: login/back, expired sessions and outage preservation; complete desktop/mobile product journeys, registration/reset, billing UI fixtures, form fixtures, PDFs, history, deletion, and analysis resilience passed.
- Product and intake tests use synthetic fixtures; no real payment, provider, email, or intake service was enabled. No backend source changed, so backend/database suites were not rerun.
- Full diff reviewed; no secrets, environment files, generated build artifacts or browser dependencies included. Evidence is in browser-report.json. Local screenshots were visually reviewed.

## Deployment and remaining gates

The review branch push is authorized to trigger the existing Vercel Git integration. No merge or Production promotion is authorized. Deployment status and any deployed-browser evidence are reported in the final task response. The saved Vercel CLI credential returned HTTP 403 for read-only deployment listing; GitHub's Vercel commit status remains available.

Before a public Production release: explicitly authorize promotion, confirm the approved public hostname and marketing build flags on that target, and review operator identity/contact, privacy disclosures and hosting-level logging/analytics. Early-access intake, real analysis, payment processing and backend deployment remain outside this release.
