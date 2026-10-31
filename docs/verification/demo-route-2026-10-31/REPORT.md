# Direct public workspace demo — 2026-10-31

The marketing “Try the Free Demo” actions now link to `/demo`, not a marketing-section anchor. The public Free demo navigation link also opens this route. The existing inline landing sample remains available without changing product-mode landing behavior.

`IncidentWorkspace` extracts the existing real editor/assessment layout from Home without changing its operational handlers. The public route reuses this layout, Header, LogInput, AnalyzeButton and AnalysisPanel. Three existing examples are shared between the landing preview and the full workspace. Sample selection, prepared-assessment display and clearing run synchronously in memory. The editor is read-only and clearly labeled as synthetic; no personal logs, uploads or live analysis are offered. The empty-state and action-label overrides are optional and retain the existing product defaults.

The public route allowlist accepts `/` with existing marketing anchors and `/demo` with its workspace anchor. Trailing slash and query strings are normalized; authentication/product/billing/unknown routes and auth fragments remain inaccessible. The public location subscription follows hash and browser history changes. Native same-origin links and the existing Vercel SPA rewrite support direct access and refresh. “Back to Home” is visible in the top bar and navigation.

ProductApp, authentication/registration/recovery/session code, account/billing implementation, API request client, provider/backend code and production configuration are unchanged. Marketing mode still never mounts ProductApp or Home and its API client blocks requests before fetch. Twenty-four existing auth, analysis, upload, account, history and export handlers match the previous commit after AST normalization.

Validation results:

- ESLint, TypeScript, production builds (marketing, product/intake-closed, product/intake-enabled), API-isolation regression and source-handler preservation check passed.
- Built marketing and full `/demo` workspace passed at 320, 390, 768 and 1440px with zero API/fetch/XHR/external requests, page errors, horizontal overflow or axe violations.
- CTA navigation reaches `/demo`, not a section anchor. All three scenarios passed severity, confidence, summary, evidence copied from the selected log, and troubleshooting checks. Clear and empty selection behaved correctly.
- Direct `/demo`, `/demo/`, query cleanup, refresh, Back to Home and browser back/forward passed. Auth fragments, auth/reset/product/account/billing and unsupported routes stay inaccessible. Stale and absent tokens require no authentication and never trigger session calls.
- Existing intake, desktop/mobile product journeys, real PDF downloads, analysis resilience and the full four-width product design/state matrix passed with service fixtures. Product authentication and both themes remain operational in product mode.
- Browser testing exposed a same-document invalid-fragment edge case; navigation listeners now normalize URLs even if the canonical route does not change. The complete rerun passed.

[Browser verification](browser-report.json). Desktop and mobile workspace screenshots were visually reviewed; CI retains the complete browser artifact. No environment files, secrets, temporary tooling, dependencies or generated build output are included. No production merge, backend deployment, credentials, hosted environment setting or service activation is part of this change. The final response reports the pushed commit and automatic Vercel Preview status/URL.
