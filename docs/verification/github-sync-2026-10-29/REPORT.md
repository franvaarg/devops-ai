# Pre-push validation and safe-branch handoff — 2026-10-29

Repository: franvaarg/devops-ai. Review branch: review/kanyi-marketing-only-2026-10-29. The initial staging branch was ahead of origin by f6daf77 and 78e02db; this branch preserves both commits. Production/default main is not the push target.

## Configuration decision

Vercel API reads returned HTTP 403 using available local account access. No token refresh or configuration change was performed. The production branch, project/domain ownership and required production build flags remain unverified. GitHub's default branch main is known; it is not proof of Vercel's production branch. Therefore synchronize only the separate review branch. A Git-connected preview may be triggered; it must not be treated as verified production configuration.

See [manual Vercel confirmation](../../GITHUB_SYNC.md), [configuration evidence](vercel-verification.json), and [secret review](secret-review.json). No backend deployment, production migration, lead enablement, billing change or credential modification is authorized by this synchronization.

## Local checks

The nine-stage local release check passed: backend syntax, incident fixtures, 229 backend unit/API/security tests, 37 isolated PostgreSQL integration tests, frontend lint, TypeScript, exact marketing-only production build, and both dependency audits. [Machine-readable results](release-checks.json). Both dependency audits reported zero vulnerabilities at execution time.

The first full browser rerun exposed an intermittent success-focus failure. EarlyAccessForm was corrected to focus after the success DOM commits through useEffect, replacing animation-frame scheduling. Frontend lint, TypeScript and the exact marketing build passed again after the correction; backend code was unchanged by that correction. Three browser-mode artifacts were rebuilt from the corrected source.

The final browser suites verify marketing-only with an unreachable API and accidentally enabled frontend intake flag, product mode with intake closed, and product mode with intake enabled. Tests use built static artifacts, synthetic API responses and isolated local servers; no production/provider/payment traffic is involved. Automated accessibility checks do not establish certification.

CI was updated to run these built-artifact suites on GitHub, with pinned browser tool versions matching local execution. GitHub-hosted completion is separate evidence and is not inferred from these local results.

## Files and exclusions

[Files included relative to the previously published staging branch](files-included.txt) includes the two pending reliability commits and the new commit. The current synthetic demo is preserved in the tracked frontend/src/components/PublicDemo.tsx component.

Included: marketing layout/copy/styles, public mode, closed-intake state, social assets, PostgreSQL lead implementation/migration, backend/frontend tests, CI, documentation and intentional synthetic verification screenshots/JSON. No configured local secret matched the reviewed pending file contents or pending-commit blobs. Pattern findings are synthetic redaction fixtures and placeholders. Ignored .env files, local credentials, node_modules, dist, logs, temporary tools and databases are excluded.

Remaining production gates: manually verify the actual Vercel project/domain and production branch, frontend root/build/output, exact Production-scoped build flags, approved identity/contact/policies and hosting-data handling, then review the built artifact before production approval. Keep lead collection, product invitations and subscriptions behind their separate readiness gates.


[Final product journey](product-journey.json) records passing desktop/mobile authentication, analysis, context, history, valid PDF downloads, deletion, quota, provider/billing error and reset/session recovery checks. [Final intake regression](intake-regression.json) records passing form error, duplicate, persistence-acknowledgement and success-focus checks.

All final browser suites passed after the focus correction: [mode/layout checks](browser-modes.json) and [analysis resilience](analysis-resilience.json). Marketing checks passed at 320, 390, 768 and 1440px with zero API calls, overflow or axe violations, including stale sessions and old analytics consent. Both disabled and explicitly enabled intake modes passed. No tests were skipped to obtain the final passing result.

The [new commit manifest](new-commit-files.txt) distinguishes the staged landing/intake/CI/documentation changes from files already present in the two pending reliability commits. No generated build output or local environment file is included.
