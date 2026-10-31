# KANYI free public demo release — 2026-10-31

## Public experience

Marketing mode now leads directly to “Try the Free Demo” (`#demo`), with “Explore How It Works” (`#how`) as the secondary action. Navigation and footer actions use the free demo. Early-access sections, availability messaging, waiting lists, tester recruitment, account links and commercial calls to action are absent. The retired `#early-access` fragment redirects to the landing like other unsupported routes.

The public FAQ, data section and footer describe prepared synthetic examples running locally in the browser, with no live AI analysis, uploads, personal information or backend connection. Each of the three scenarios displays severity, confidence, potential cause, recommended next step and inspectable evidence. The existing design and responsive styles are preserved.

Product mode retains authentication, SaaS workspace, billing, provider integrations, database integration, data-handling disclosures and separately gated intake. None is enabled in marketing mode. Shared API requests still reject before fetch and analytics remains suppressed, including with stale auth tokens and saved analytics consent.

## Build and validation

Exact standalone marketing configuration: `VITE_MARKETING_ONLY=true`, `VITE_EARLY_ACCESS_ENABLED=false`, empty `VITE_API_BASE_URL`. Review-branch Vercel Preview builds continue to enforce these public flags without modifying hosted environment variables or production settings.

Validation results are recorded in browser-report.json. The browser suite serves built static files without a backend, blocks and records all external/API/fetch/XHR requests, checks the absence of recruitment/commercial/account actions, verifies both hero CTAs and all scenarios, and checks blocked routes, refresh and history. It runs axe WCAG A/AA checks, keyboard navigation, reduced motion and overflow checks at 320, 390, 768 and 1440px. Product and explicitly enabled intake tests use fixtures only and do not activate any service.

Results: ESLint, TypeScript, API-isolation regression and marketing/product/intake production builds passed. The full browser rerun passed all four widths with zero API/fetch/XHR/external requests, page errors, horizontal overflow or axe violations. All three scenarios and both CTAs passed. The existing intake, desktop/mobile product journey and analysis resilience suites passed with fixtures. Desktop and mobile screenshots were visually reviewed. One initial local Chromium run exited unexpectedly during the final accessibility scan; the complete rerun passed. No backend source changed; no local backend/database suite was rerun.

## Hosting boundary

The saved Vercel CLI credential was checked against the read-only `/v2/user` endpoint and returned HTTP 403 `forbidden`, “Not authorized”. The previous Preview required Vercel Authentication. The new commit is pushed to the existing review branch to trigger the existing automatic Preview integration. Its deployment status, URL and anonymous-access check are reported in the final response. Public hosting cannot be claimed until that URL is anonymously accessible. No production setting, main merge, promotion, backend deployment, lead intake or billing activation is part of this release.
