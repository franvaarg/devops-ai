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

## 2026-10-28 — Comprehensive diagnostic, calibration and operational validation

Reproduced the clean baseline at `f6daf77d2074e42f2c344bdf1e2767a5cdb90f9f`: 160 backend tests and 31 isolated PostgreSQL tests passed. Read the audit, Phase 2 report, transformation-readiness report and existing development entry before corrections. Preserved the existing application architecture and unrelated features.

Measured dimensions:

- **Diagnostic accuracy — VERIFIED OFFLINE only:** 49 justified synthetic scenarios / 147 fixed proposal variants. Neutral severity agreement improved 39/49 → 49/49; actionability 38/49 → 49/49; required support 35/49 → 49/49; cause-plausibility rubric 41/49 → 49/49; read-only usefulness rubric 38/49 → 49/49. Critical-as-noise stayed 0/8 unique critical cases; critical undertriage improved 4/8 → 0/8. These are in-sample backend-policy results, not real Gemini or production-log accuracy.
- **Confidence calibration — support compliance VERIFIED OFFLINE; empirical calibration NOT VERIFIED:** label agreement 40/49 → 49/49, overconfidence violations 2 → 0, underconfidence 7 → 0. Final labels: 37 Low, 11 Medium, 1 High. Direct diagnostics and same-service configuration corroboration support higher confidence; conflicts/multiple mechanisms reduce it. A blanket Low policy cannot pass. No probability calibration claim or numeric confidence mapping is justified.
- **Operational reliability — VERIFIED OFFLINE:** transport fault scenarios 8/11 → 11/11; final backend tests **223/223** and real PostgreSQL tests **35/35**, all passing. Daily-quota metric retries drop 3 → 1; unsettled timeout attempts drop 3 → 1 with maximum local overlap 1. SQL persistence failures roll back usage, provider failures release reservations, request IDs remain correlated, 16 concurrent HTTP last-slot requests invoke the provider exactly once, and cross-account history/deletion stays isolated.

Corrected conflicting counter/alias/JSON-key acceptance as noise; loss of JSON/quoted logfmt impact; missed core-replica and corroborated disk-write impact; negated-memory causal claims; incomplete evidence and useful diagnostic detail; excessive confidence conservatism; unscoped retry recovery; post-normalization diagnosis overflow; overlapping noncooperative timeouts; quota metric spelling and malformed provider-detail handling. Destructive proposals remain removed and require human review; no remediation executor was introduced.

Fresh security audits found three affected dependency packages per project. Targeted compatible updates, with lifecycle scripts disabled, leave **zero reported npm vulnerabilities in both projects**. Backend/frontend lockfiles changed; package manifests and frontend feature source did not. Frontend lint, TypeScript checks, production build, backend syntax checks and 28 existing fixture definitions passed after updates. Network-restricted audit attempts were superseded by successful registry checks outside the sandbox.

Latency: interleaved direct-policy microbenchmark (490 samples per engine) p95 increased 0.289 → 2.215 ms, with final p50 0.165 ms and maximum 47.602 ms. New parsing has a measured CPU cost. Mock-provider Express/PostgreSQL success p50/p95 was 57/436 ms; these are not live Gemini latency or production SLOs.

Files changed/added: `backend/src/services/analysisSafety.js`, new `backend/src/services/logObservations.js` and `backend/src/services/diagnosticSupport.js`, `backend/src/services/aiReliability.js`; `backend/scripts/reliability-cases.cjs`, `validate-ai-reliability.cjs`, `validate-ai-operations.cjs`; `backend/test/reliabilityValidation.test.js`, `aiProvider.test.js`, `aiReliability.test.js`; `backend/integration/postgres.test.cjs`; backend/frontend lockfiles; `docs/AI_PROVIDER.md`, `docs/verification/AI_ENGINE_AUDIT.md`, `docs/verification/AI_RELIABILITY_VALIDATION.md` and the baseline/final artifacts under `docs/verification/ai-reliability-2026-10-28/`; this appended entry.

Live Gemini: **NOT VERIFIED**, 0 generation requests / $0 cost. A key is present but current billing tier/remaining free quota cannot be verified; historical quota failures are not today's allowance. Active budget stayed zero. A future maximum-three-attempt, serial, no-retry, $0-only smoke budget requires verified free capacity; paid capacity requires separate approval. No production data access/change, push or deployment occurred.

Remaining blockers: representative independently adjudicated unseen data; actual Gemini quality/availability/latency; empirical confidence calibration; nested/multiline formats and broader security/data-loss diagnoses; severity/SLO thresholds; upstream cancellation/billing and shared provider budget across instances; old stored decisions/replays; long-output generation. Source matching does not prove truthful logs. Metamorphic checks are not an independent production dataset.

Next priorities: operator quota/billing evidence, budgeted live smoke test, external diagnostic review and representative benchmark expansion, historical-result policy, live latency/cost and multi-instance budget verification. **Commercial/production readiness remains NOT ESTABLISHED.** Local commit message: `test: validate KANYI diagnostic calibration and operational reliability`. Do not push or deploy without explicit approval.
