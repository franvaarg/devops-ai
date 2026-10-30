# GitHub synchronization and Vercel handoff — 2026-10-29

Review branch: `review/kanyi-marketing-only-2026-10-29`.

The checkout originally used `staging/p0-resolution-2026-10-14`, two commits ahead of its remote (`f6daf77` and `78e02db`). The review branch preserves those diagnostic reliability commits and adds the validated marketing, disabled-by-default lead intake, tests and documentation. No existing production or staging branch is updated by this synchronization.

GitHub confirms repository `franvaarg/devops-ai` has default branch `main`. This does not establish Vercel's production branch. Available Vercel account access returned HTTP 403 for team/project metadata, so production branch, project/domain ownership, build settings and production environment values could not be verified. No credential refresh or live setting change was attempted. Do not push or merge this review branch into a production deployment branch until those settings and the public launch gates are confirmed.

## Manual Vercel confirmation required

In the Vercel project that actually owns `devops-ai-chi.vercel.app`, verify:

1. **Git connection:** owner/repository is `franvaarg/devops-ai`. Record the exact **Production Branch**; do not infer it from GitHub's default. Confirm the review branch is not selected for production.
2. **Domain/target:** the project is the existing site, and `devops-ai-chi.vercel.app` belongs to its intended production deployment. Check deployment target and source commit before promotion.
3. **Build settings:** root directory `frontend`, Vite/static build, build command `npm run build`, output `dist`, and install using locked dependencies (`npm ci`). Confirm build-command overrides do not inject different flags.
4. **Production-scoped build environment:** exact `VITE_MARKETING_ONLY=true`, `VITE_EARLY_ACCESS_ENABLED=false`, and empty `VITE_API_BASE_URL`. Review inherited variables and scope overrides. Frontend variables are public; no Gemini, Stripe, database or auth secrets are needed. `.env.example` and GitHub Actions variables do not configure Vercel.
5. **Preview environment:** review branches can trigger Vercel previews. Confirm the same marketing-only settings in Preview before using any generated preview as a public marketing site. A successful preview does not prove Production settings.
6. **Disclosures:** approve and supply real VITE_LEGAL_NAME, VITE_SUPPORT_EMAIL, VITE_PRIVACY_URL and VITE_TERMS_URL as appropriate. Resolve hosting/log retention, local-preference disclosure and contact ownership. Do not insert invented policy URLs or identities.
7. **Publishing:** environment changes require a new build. After separate production approval, use the reviewed commit/artifact and verify HTTPS, headers, routes, opening-soon state, synthetic demo and zero API requests, including stale-session and old-consent browsers. Confirm final absolute social-image URLs/canonical metadata.

Do not deploy the backend, run migration 006, enable EARLY_ACCESS_ENABLED/BILLING_ENABLED, or alter live credentials as part of frontend Git synchronization. Working lead intake and paid subscriptions retain separate readiness gates in EARLY_ACCESS.md and BILLING.md.

## Review scope and exclusions

All uncommitted source/documentation changes were reviewed along with the two pending commits. Scanning checked high-confidence credential patterns and exact matches to configured local secrets without printing values. Findings were synthetic redaction-test fixtures and example placeholders; none matched configured local secrets. Pending commit blobs were also checked for exact local-secret matches.

Local .env files, frontend/.env.local, node_modules, dist, logs, browser tools, credential storage and temporary test databases are excluded. Committed generated assets are intentional social artwork and synthetic verification PNG/JSON reports. Changed JSON parses and verification PNGs contain no text/EXIF metadata. This is a scoped review, not a guarantee that automated scanning detects every possible secret.

CI now builds the exact closed-intake marketing configuration and runs the built marketing, intake-closed/intake-enabled, form, product and resilience browser regressions. CI performs tests and does not deploy the backend. Remote CI/Vercel status must be reported separately from completed local results.

The browser CI pins Playwright 1.64.1 and axe-playwright 4.14.0 to match the locally executed tools. Local checks use Node 24.21.0/PostgreSQL 18; GitHub Actions retains Node 22/PostgreSQL 16. Remote runner results are not inferred from local runs.

The final pre-push form regression exposed intermittent confirmation focus when it depended on requestAnimationFrame. EarlyAccessForm now focuses confirmation in an effect after the success DOM commits. The browser assertion continues to require that focus; it was not removed or weakened. Frontend checks and browser regressions are rerun after this correction.
