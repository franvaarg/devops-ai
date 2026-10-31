# KANYI Technical Dark design system

The marketing site, synthetic example and complete product use one graphite/teal system. The default product theme is dark; saved light preferences and the existing theme toggle remain supported. Marketing always uses the dark identity.

## Tokens

`frontend/src/index.css` defines semantic canvas, panel, raised-panel, code, ink, muted, line, accent and accent-ink variables. Graphite surfaces are #101214 / #181b1f / #1f242a, with #79d7cd for restrained emphasis. Light product mode overrides semantic tokens. The spacing scale is 4/8/12/16/24/32px. Surfaces use 4–6px corners, thin borders and no decorative gradients or glow. Use system sans typography for reading and monospace for source excerpts, section metadata and compact status indicators. No external font request is required.

`components/IncidentWorkspace.tsx` shares the actual input/assessment layout between the real product and the public `/demo` route. `components/ui/Workspace.tsx` supplies `WorkspaceBar`, `DecisionMetrics`, `StatusBadge`, `SourceExcerpt` and `EvidencePanel`. Public examples and actual analysis results share these primitives. Severity is always named in text and uses a semantic badge, so color is not the only signal. Confidence remains qualitative. `AnalysisPanel` is shared by current results and saved-history details, preserving uncertainty, missing information, verification steps, recommendations, noise assessment and optional input/context metadata.

## Layout and states

The product shell provides identity/session controls, workspace navigation, an incident editor and assessment column, followed by searchable history and account/usage. The editor and assessment stack below 1100px; navigation becomes a compact horizontal row below 760px. All grids use shrinkable columns and long evidence/log text wraps. Public demo source and assessments use the same headers, metric grid and evidence panels as the workspace.

Authentication, registration, recovery and reset retain real service handlers and validation. Account UI retains real quota values, a labeled progress meter, verified subscription states, portal/checkout controls and password-confirmed account deletion. History retains expansion, original input, PDF export and delete confirmation. Loading/empty/error/success states use the same tokens; only functional loading indicators animate. Focus outlines and reduced-motion support are explicit.

## Functional boundaries

This is a frontend presentation change. API request contracts, Gemini integration, authentication/session validation, upload validation, account authorization, history ownership, analysis idempotency, quota enforcement, PDF generation and billing handlers remain real product behavior. Marketing mode continues to bypass product mounts and reject API calls before fetch; it accepts no login, personal data, uploads or payments. Test fixtures exist only in browser scripts.

`verify-public-modes.cjs` covers the mode boundary and existing product regressions. `verify-design.cjs` adds four-width product screenshots and axe checks for auth, registration, recovery, empty workspace/quota, real FileReader, assessment, expanded history/delete confirmation, billing attention and account error. `verify-journey.cjs` also checks both product themes and downloads real PDFs from synthetic fixture records. No hosted account, payment, analysis provider or database is activated by these checks.
