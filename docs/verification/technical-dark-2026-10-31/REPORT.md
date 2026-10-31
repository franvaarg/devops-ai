# Full KANYI Technical Dark interface redesign — 2026-10-31

## Scope

The redesign covers the complete existing product as well as the marketing site and synthetic demo. Deep graphite surfaces, restrained teal accents, small radii, thin borders, mono metadata and consistent spacing replace gradients, glows, oversized containers and decorative hover movement. Dark is the default product theme; saved preferences and the light-mode toggle are preserved. Marketing always uses the dark design.

Completed product areas: workspace/session navigation; log editor and validated file input; operational context; current incident assessment; severity/confidence/actionability/risk; hypotheses and evidence; missing context and verification checks; recommendations/troubleshooting; history/filter/empty/loading states; expanded saved analyses and original input; PDF/export and delete confirmation; account/quota meter, subscription/billing states and password-confirmed account deletion; login, registration, email recovery and password reset; session/provider/account error and success/pending states. Mobile navigation fits all three destinations; long names truncate without losing their accessible text.

Shared primitives in `frontend/src/components/ui/Workspace.tsx` provide workspace bars, decision metrics, semantic severity badges, source excerpts and evidence panels. The public demo and actual product results share these primitives. Current and saved analysis results both use AnalysisPanel, preserving their full uncertainty, evidence and troubleshooting data. See ../../DESIGN_SYSTEM.md for tokens, layout and maintenance guidance.

## Functional preservation

The frontend API client, backend, provider integration, database, billing implementation and PDF generation code are unchanged. Existing real product handlers and authorization/request flows remain active only in normal product mode. Source-level handler comparison and browser regressions verify preservation. The only new product state tracks the current navigation anchor. The quota meter displays existing account data; it does not change enforcement or activate plans.

Marketing mode still skips product/auth/session mounts and rejects API requests before fetch. It exposes no uploads, login, account, lead or billing flow. Its examples remain explicitly synthetic and local, with no live Gemini call. The existing review-branch Preview build override retains marketing=true, early-access=false and an empty API base URL. No production configuration, credential, merge, backend deployment or service activation is part of this change.

## Validation and evidence

Local production-build browser evidence is linked below; final deployment/CI status and Preview URL are reported in the final task response. Product service responses are explicit fixtures, not replacement application logic. No real provider, payment, email, database or user service was activated.

Accessibility runs exposed two caption contrast issues (dark auth story and a light-mode field hint); both were corrected. An initial four-width upload test asserted before FileReader completed; it now waits for the actual editor value. Final verification includes the corrected mobile navigation and long display names.


Final local results:

- ESLint, TypeScript and API-isolation regression: passed.
- Production builds for exact marketing configuration, product/intake-closed and product/intake-enabled: passed. The shared TypeScript project was checked before the mode-specific Vite builds.
- 24 real authentication, analysis, upload, account, history and export handlers are unchanged after AST normalization; service client and backend files are unchanged.
- Four-width marketing checks: passed with zero API/fetch/XHR/external requests, page errors, overflow or axe violations. All three synthetic scenarios, evidence, CTAs, blocked routes, refresh/history, stale tokens, keyboard navigation and reduced motion passed.
- Existing product desktop/mobile journeys, intake regression and analysis resilience: passed. Both dark/light product themes passed axe; downloaded PDFs have valid PDF headers and content. Registration, returning login, logout, recovery/reset, history/deletion, quota, pending/paid/canceled subscription, billing/provider errors and session preservation remain working with fixtures.
- New full-product design matrix: 28 screen/state audits at 320/390/768/1440px passed, with zero axe violations or document overflow. Includes native FileReader completion, long names, navigation current state, password-gated account deletion controls, empty/error/quota states, expanded history and delete confirmation, and billing attention.
- Desktop/mobile marketing, workspace, authentication and history/billing screenshots visually reviewed. No real user data appears in the evidence.

Evidence: [mode checks](public-modes.json), [product journeys](product-journey.json), [four-width product matrix](product-design.json), [resilience](resilience.json).

Representative screens: [workspace](product-workspace-1440.png), [mobile authentication](product-auth-390.png), [expanded history, delete confirmation and account/billing](history-billing-1440.png). The browser CI artifact contains all state screenshots. These screenshots demonstrate the real product components with explicit test responses; they are not replacement product implementations. The Vercel review Preview remains in marketing mode, so it does not expose authentication or billing.

No secrets, environment files, generated build output, temporary tooling or browser dependencies are included in the commit. Deployment/CI results and the exact final SHA are reported after the authorized review-branch push. No Production promotion or main merge is authorized.
