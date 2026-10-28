# Development record

## 2026-10-28 — Phase 2 AI reliability and safety

Implemented deterministic backend incident safeguards after reading the complete Phase 1 audit. Preserved the provider/contract/API/quota/JSONB architecture. No Gemini calls, production database changes, deployment, push or automatic remediation occurred.

Improvements and issues fixed:

- Prevent selective healthy evidence or empty extraction from dismissing supported request impact; require complete-line support and consistent severity/actionability.
- Default uncertain cases to investigation or explicit insufficiency; retain a narrow, timestamped, same-subject recovery exception and valid benign health observations.
- Bound causal confidence to Low/Medium and replace unsupported certainty/recovery claims with window-scoped conclusions.
- Remove arbitrary remediation commands; require explicit human review, owner approval and backup/rollback verification for unknown or high-risk proposals. Verification remains read-only.
- Preserve authorization failure diagnostics during redaction; separate system policy from serialized untrusted input; compute signals before generation.
- Tighten evaluator evidence requirements and case bounds, correct quality denominators, and retain policy/completion provenance.

Files modified or added:

- `backend/src/services/analysisSafety.js`, `analysisContract.js`, `geminiProvider.js`, `analysisService.js`
- `backend/src/app.js`, `backend/src/security/redactSecrets.js`
- `backend/scripts/evaluate-incidents.cjs`, `backend/scripts/incident-cases.cjs`
- `backend/test/analysisSafety.test.js`, `analysisBoundary.test.js`, `aiProvider.test.js`, `evaluation.test.js`
- `backend/integration/postgres.test.cjs`
- `docs/verification/AI_ENGINE_AUDIT.md`, `AI_ENGINE_FIX_REPORT.md`, `AI_ENGINE_STORED_REPLAY.json`
- `docs/AI_PROVIDER.md`, `docs/ARCHITECTURE.md` (current trust-boundary documentation)
- `red.md` (created; no prior record existed)

Verification: backend **160/160 tests passed**; isolated PostgreSQL 18 **31/31 tests passed**; backend syntax checks passed; 28 offline fixture definitions valid; frontend lint, TypeScript check and production build passed. Socket-restricted sandbox failures were superseded by successful unrestricted local reruns. Production build emitted a nonfatal Tailwind plugin timing advisory. No production database or live provider was used.

Finding status: **7 corrected, 5 remaining** (4 partial: F5/F7/F9/F12; 1 open: F11). Offline replay of nine stored responses retained one conservative rubric deviation: the injection example becomes Medium/Investigate instead of Low. Existing rubric bounds were not broadened to hide it. No automated regression remains failing.

Known issues: bounded log/causal/recovery formats, uncalibrated confidence, intentionally reduced free-form diagnostic detail, conservative human-review warnings, unverified provider capacity and real-world diagnostic performance. Old history and completed legacy idempotency replays retain older decisions; no backfill was performed. System separation is not universal prompt-injection immunity, and source provenance does not establish truthful logs.

Next priorities: adjudicated mixed-service/security/data-loss/long-input coverage; review conservative usefulness and severity thresholds; coherent handling of historical results; separately authorized provider availability and live quality evaluation. See `docs/verification/AI_ENGINE_FIX_REPORT.md` for per-finding details and limitations.

Commercial readiness: **not established; not declared ready**. Deterministic regression success does not establish real-world diagnostic accuracy. Save and commit locally with `fix: harden KANYI AI incident reliability and safety`; do not push or deploy without explicit approval.
