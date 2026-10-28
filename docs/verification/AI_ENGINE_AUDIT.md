# KANYI AI incident analysis engine: Phase 1 audit

Audit date: 2026-10-28. Scope: current checked-out source and stored evaluation artifacts. No application code changed, Gemini/API requests made, database accessed or changed, deployments performed, or features added. Only this report was created. Historical results are evidence of those runs, not measurements of today's provider availability or the current prompt's accuracy.

## Overall assessment

KANYI is a bounded, source-excerpt-backed Gemini diagnosis workflow, not a deterministic incident detection or causal verification engine. Input limits, redaction, strict JSON validation, literal evidence provenance, explicit provider selection, and bounded retries are useful safeguards. They do not establish that the selected evidence is representative, the classification is safe, the cause is correct, or the recommended action is appropriate.

**The current engine can accept a critical incident classified as harmless noise.** An offline contract reproduction accepted `Low / Likely Noise / High confidence` for a log containing both a successful healthcheck and a production checkout outage with 1,000/1,000 failed requests. The supplied response cited only the healthcheck. This proves an acceptance gap; it does not prove Gemini produced that particular response in production. An independent path deterministically changes any empty-evidence result to Low severity, even when its original severity is Critical.

The engine is suitable for assisted investigation with human verification. Available evidence does not support relying on its Low severity or Likely Noise classification to suppress critical alerts automatically. No automatic remediation executor was found in the inspected analysis path.

Priority definitions: P0 = demonstrated active emergency requiring immediate containment; P1 = major reliability defect or credible high-impact exposure to correct before trusting incident triage; P2 = narrower robustness, measurement, or traceability issue. No active production emergency was established; no finding is labeled P0 solely because its hypothetical outcome could be critical.

## Actual request and analysis path

1. `backend/src/app.js:86`, `handleAnalysis`: authenticated `/api/analyze` accepts a nonempty string log up to 16,384 UTF-8 bytes, rejects selected control characters, and accepts context up to 1,500 JavaScript string units. Oversized logs are rejected, not silently truncated. The JSON body limit is 256 KiB. Render events enter the same handler after `backend/src/integrations/render.js:5`, `normalizeRenderEvent`, creates caller-reported context; this is not an independently verified monitoring feed.
2. `handleAnalysis` redacts both log and context and uses a database-backed quota/idempotency reservation. A completed replay returns a stored result without generating again. This audit did not invoke this handler or its database operations.
3. `backend/src/services/aiService.js:4`, `createAnalyzer`, selects the explicitly configured provider, defaulting to Gemini. The registry has only Gemini; it does not silently fail over.
4. `backend/src/services/geminiProvider.js:67`, `analyzeLog`, redacts again and builds **one interpolated prompt string** with severity definitions, instructions, unverified context, and log text inside XML-like delimiters. `contents: prompt` is submitted to `ai.models.generateContent`. There is no separate system instruction, retrieval, tool-based verification, service dependency graph, SLO query, or metrics lookup in this path.
5. The model is `GEMINI_MODEL` or `gemini-3.6-flash`; matching 3.6/3.7/3.8 Flash names use LOW thinking. JSON MIME/schema output and a 2,048-token output cap are requested. `backend/src/services/aiReliability.js:23`, `reliableGeneration`, applies a 45-second operation deadline, 20-second attempt budget, up to three application attempts, cancellation, jitter, and selected transient-error retries. Provider rejection and malformed output return errors rather than a fabricated successful diagnosis. Parsing occurs after generation and outside the retry loop.
6. `backend/src/services/analysisContract.js:43`, `parseAnalysis`, parses bounded JSON and calls `validateAnalysis`. It validates exact keys, types, enums, text/array bounds, and literal evidence inclusion in the redacted log. Production additionally requires decision fields, missing-information array and nonempty verification steps. It does not validate causal truth or semantic consistency.
7. Only after generation, `handleAnalysis` computes `logSignals(redactedLog)`. It attaches operational context and signals, then persists the accepted result via `backend/src/services/analysisService.js:3`, `saveAnalysis`. Decisions and trust metadata are saved in `decision`; the log is redacted. The UI renders the accepted decision, confidence, evidence and likely cause in `frontend/src/components/AnalysisPanel.tsx:136` and `:157`.

## Deterministic versus model-dependent behavior

| Concern | Deterministic behavior | Gemini-dependent behavior |
| --- | --- | --- |
| Input | Type/size/control-character checks; redaction; explicit provider selection | Understanding submitted text and unverified context |
| Severity | Enum validation; empty evidence forces Low | All other Low/Medium/High/Critical choices; interpretation of impact and recovery |
| Actionability/noise | Enum/text validation; empty evidence forces Insufficient Evidence and High false-positive risk | All incident/noise decisions, recovery interpretation and legacy-warning relevance |
| Confidence | Enum validation; empty evidence forces Low | Every nonempty-evidence confidence assignment; no numeric score or calibration computation |
| Evidence | Exact substring provenance against redacted source; bounds | Selecting excerpts, completeness, relevance, and contradictory evidence handling |
| Cause | Nonempty text; empty evidence replaces cause with an insufficiency message | Hypothesis, causal relationship, qualification and certainty |
| Actions | Text/array bounds; production requires at least one verification step | Commands, ordering, safety, read-only status, operational appropriateness |
| Signals | Exact duplicate count, narrow timestamp parsing, age/future counts | Any actual use of age or repetition in diagnosis: counters are computed after generation |
| Reliability | Deadlines, retry policy, sanitized errors, logging of token counts | Provider availability and generation completion |

There is no severity formula, confidence probability calculation, deterministic false-positive classifier, evidence coverage score, causal proof engine, or independent recommendation validator in the inspected path. Prompt instructions are policies requested of Gemini, not enforced guarantees.

## Findings

### F1 — Critical impact can be dismissed through selective evidence (P1)

**Status:** Confirmed acceptance defect; live frequency unknown.

**Files/components:** `backend/src/services/analysisContract.js:12`, `validateAnalysis`, particularly `:30`; `backend/src/services/geminiProvider.js:74`, diagnosis prompt.

**Technical explanation:** Evidence validity is only `source.includes(excerpt)`. There is no check that adverse impact is covered, that recovery applies to the affected service, or that severity, actionability and noise assessment agree. Any nonempty source-backed excerpt permits High confidence and Likely Noise. Arbitrary fragments such as `ERROR` also pass.

**Realistic failure:** A batch mixes healthy infrastructure probes with a total checkout outage. Gemini selects a healthy probe, treats the rest as retries/legacy noise, and recommends no intervention. Offline reproduction accepted this exact classification pattern with explicit 100% checkout failure in the source.

**Recommended correction:** Require structured links from impact/recovery claims to service-, time- and request-scoped evidence. Add conservative contradiction handling: unresolved supported impact should prevent a benign dismissal and require investigation. Test mixed healthy/critical streams and misleading recovery. Avoid keyword-only severity floors that turn quoted or historical text into incidents.

### F2 — Empty evidence silently downgrades potential critical impact (P1)

**Status:** Confirmed deterministic behavior and unsafe severity fallback; actual missed incident not established.

**File/component:** `backend/src/services/analysisContract.js:34`, `validateAnalysis` empty-evidence branch; `backend/test/analysisBoundary.test.js`, test `no evidence cannot retain unsupported outage severity` explicitly enshrines it.

**Technical explanation:** An empty array is allowed and causes severity Low, confidence Low, actionability Insufficient Evidence, and false-positive risk High. This infers low impact from a model's failure to extract evidence. Summary, recommendation, steps and noise assessment remain unchanged and may contradict the rewritten fields.

**Realistic failure:** A valid JSON response to an outage log omits evidence. The product saves a Low result, making a severity-filtered review miss it. It may retain prose declaring an outage or advising dismissal despite its rewritten cause.

**Recommended correction:** Treat extraction failure as an invalid/incomplete assessment or an explicit unknown severity requiring review. Do not equate unknown impact with Low impact. Make the entire decision coherent when handling insufficiency, rather than rewriting only some fields.

### F3 — Root-cause confidence is self-reported and demonstrably inflated historically (P1)

**Status:** Historical overconfidence confirmed; current enforcement gap confirmed; present model error rate unknown.

**Files/components:** `backend/src/services/geminiProvider.js:74`, confidence prompt; `backend/src/services/analysisContract.js:12`, enum-only confidence validation; `docs/verification/2026-10-07/ai-quality-review.json`, retrospective review.

**Technical explanation:** High confidence is requested only for direct causal evidence, but any valid nonempty excerpt leaves High untouched. No deterministic distinction exists between confidence in an observed recovery and confidence in the hypothesized reason for failure. Historical responses showed exactly that conflation.

**Realistic failure:** Retry success is clearly observed, but the model assigns High confidence to an unobserved network delay. An engineer pursues networking and overlooks pool exhaustion or another cause.

**Recommended correction:** Separate observed-condition certainty from cause confidence; require causal support and explicit alternatives for cause claims; apply conservative confidence bounds when causal support is absent. Use blind human adjudication and stored-response regressions. Do not present qualitative labels as calibrated probabilities.

### F4 — Root-cause and prose claims are not grounded by contract (P1)

**Status:** Confirmed validation gap and historical overreach.

**Files/components:** `backend/src/services/analysisContract.js:21`, `validateAnalysis` text checks; `backend/src/services/geminiProvider.js:74`, root-cause instructions; `docs/verification/2026-10-07/live-incidents.json`, `deployment-rejected-with-recovery` and `supported-service-impact`.

**Technical explanation:** Only the evidence array is source-matched. Summary, cause and noise prose can assert invented chronology, current health, dependencies or causal certainty while citing genuine text. The historical readiness result inferred that failure “automatically triggered” rollback and called production “currently healthy.” The excerpt showed rollback and successful requests in a window, not a trigger mechanism or present health. The database case presented association as demonstrated causation in noise prose.

**Realistic failure:** An old deployment excerpt is reported as healthy now; the user overlooks a new outage. A plausible cause becomes an asserted fact through prose.

**Recommended correction:** Distinguish observations, hypotheses, and unverified context in the contract. Link material claims to evidence and qualify time scope. Validate certainty and contradiction policies conservatively; retain human causal review because textual matching alone cannot prove a cause.

### F5 — Legacy/noise safeguards are prompt-only; signals arrive too late (P1)

**Status:** Confirmed architectural limitation; mixed-stream failure remains a suspected model outcome.

**Files/components:** `backend/src/app.js:110–112`, `handleAnalysis`; `backend/src/services/logSignals.js:1`, `logSignals`; `backend/src/services/geminiProvider.js:74`, noise prompt.

**Technical explanation:** Timestamp and duplicate counters are calculated after `analyzeLog` returns, so they cannot constrain that decision. Counters match only exact duplicate lines and leading ISO timestamps with explicit timezone. Time-only, local, embedded and other formats are not dated. There is no deterministic service-aware recovery correlation or legacy signature analysis. Old logs are not inherently harmless; they may describe unresolved or historically severe impact.

**Realistic failure:** Thousands of timestamp-varying warnings dominate a short excerpt, a different service recovers, and a current critical failure is incorrectly grouped into the benign pattern. A recent healthy line is treated as recovery for an unrelated outage.

**Recommended correction:** Compute normalized temporal/service signals before inference and expose uncertainty explicitly. Preserve raw line references and adverse evidence while grouping duplicates. Require recovery to match the affected service/window. Never use age or repetition alone to suppress severity.

### F6 — Recommendation safety and read-only verification are unenforced (P1)

**Status:** Confirmed acceptance defect; no automatic execution found.

**Files/components:** `backend/src/services/geminiProvider.js:112–118`, action instructions; `backend/src/services/analysisContract.js:21–28`, text/array validation; `backend/src/services/geminiProvider.js:157`, trust-field presence check.

**Technical explanation:** The prompt requests safe actions, read-only verification, and approval/backup warnings for destructive actions. Validation checks only strings and arrays. It accepts an immediate production database drop without warnings and accepts deletion as a verification step. `steps` can be empty if `verificationSteps` is nonempty.

**Realistic failure:** A correct database diagnosis suggests a destructive reset as its next action, and an engineer follows it believing the structured result was safety-checked.

**Recommended correction:** Separate diagnostics from proposed mutations, enforce a conservative action policy and explicit prerequisites, and reject unsafe or contradictory recommendations. Ensure verification is actually read-only. Keep owner approval outside model authority; no execution feature is needed for this correction.

### F7 — Prompt boundaries are not a security boundary (P1)

**Status:** Confirmed structural exposure; successful bypass not demonstrated.

**Files/components:** `backend/src/services/geminiProvider.js:74–139`, interpolated prompt and `contents`; `backend/src/app.js:90–100`, input validation.

**Technical explanation:** Context and log are interpolated into the same prompt as instructions. Delimiter strings are not escaped or rejected, and there is no separately supplied system policy. Text can close the apparent log/context region and impersonate instructions. Even system separation cannot fully solve injection; semantic output checks remain necessary.

**Realistic failure:** An attacker-controlled error message requests Low/Likely Noise for an actual security incident while quoting a real healthy line to satisfy provenance validation.

**Recommended correction:** Place invariant policy in the appropriate separate instruction channel, serialize untrusted input unambiguously, and test delimiter-spoofing and suppression attacks in both context and logs. Apply independent decision safeguards. The historical injection case tested escalation to Critical, not malicious de-escalation of real harm.

### F8 — Redaction can erase nonsecret incident evidence (P1)

**Status:** Confirmed deterministic information loss; downstream classification effect not measured.

**File/component:** `backend/src/security/redactSecrets.js:5`, `redactSecrets`, especially header and assignment regex replacements; called by `backend/src/app.js:104` and `backend/src/services/geminiProvider.js:68`.

**Technical explanation:** The case-insensitive header regex matches `authorization:` anywhere and removes the rest of that line, including ordinary diagnostic text and impact metrics. An offline input `ERROR authorization: permission denied; production requests=1000 failed_requests=1000` became `ERROR authorization: "[REDACTED]"]`. The trailing bracket comes from overlapping header/assignment replacement. Lost facts never reach Gemini and cannot be quoted as evidence.

**Realistic failure:** Authorization failures and total request failure share one structured log line. Redaction removes all impact data, leaving the model to classify an apparently context-free authorization event.

**Recommended correction:** Use format-aware, field-scoped redaction with diagnostic preservation tests and explicit redaction-loss metadata. Retain impact/status fields safely; do not weaken credential protection. Separate guarantee: regex redaction is best-effort and cannot establish that arbitrary personal data or custom secrets never reach the provider.

### F9 — Evaluation can pass weak evidence and poor diagnoses (P1)

**Status:** Confirmed scoring defect and coverage limitation.

**Files/components:** `backend/scripts/evaluate-incidents.cjs:7`, `score`, particularly `:12`; `backend/scripts/incident-cases.cjs:42–48`, fixture construction.

**Technical explanation:** Required evidence accepts either containment direction. A tiny quote `ERROR` satisfies the required first line whenever that line contains ERROR. Evidence correctness uses `every`, which also passes empty arrays. Required evidence usually covers only the first line, not impact or recovery. The 17 additional cases allow every actionability enum and every confidence enum; all accept Low/Medium severity. Broad hypothesis/action keywords and three hallucination patterns cannot establish usefulness or safety. The checker omits noiseAssessment and missingInformation from its hallucination prose scan.

**Realistic failure:** A weak database answer quotes only ERROR, says “Possible connection failure,” and offers “Check health.” Offline scoring passed all nine checks for the supported-impact fixture, including required evidence. A regression that dismisses one of the added operational failures can also pass its decision bound.

**Recommended correction:** Require complete meaningful evidence spans or line IDs covering fixture-specific impact/recovery facts; remove reverse containment. Tighten case-specific decision/confidence expectations and add contradictory signals, genuine security breach/data loss, critical failures hidden among noise, adverse ordering, context spoofing, and near-limit inputs. Keep automated proxies separate from independent diagnostic review.

### F10 — Quality metrics conflate availability with diagnostic quality (P2)

**Status:** Confirmed report-generation limitation; later interpreted artifact corrects it manually.

**File/component:** `backend/scripts/evaluate-incidents.cjs:43–52`, metrics aggregation; `docs/verification/p0-resolution-2026-10-14/live-ai-metrics-interpreted.json`.

**Technical explanation:** Evidence/usefulness rates divide by all cases rather than returned analyses. Zero returned outputs produces zero overconfidence/hallucination failures, though neither was evaluated. `overconfidenceFailures` counts any confidence-bound violation, not specifically upward errors. Provider availability and conditional quality need separate denominators and unknown/not-evaluated states.

**Realistic failure:** An outage-only evaluation is read as having no hallucinations or overconfidence, or a provider improvement appears to change evidence quality solely because more outputs arrived.

**Recommended correction:** Report attempted/returned/valid counts, end-to-end success, conditional quality rates, under/overconfidence separately, and null quality metrics with zero outputs. Preserve the explicit interpretation already present in the historical companion artifact.

### F11 — Provider dependence remains an empirically demonstrated availability risk (P1)

**Status:** Historical failures confirmed; current availability and credential configuration deliberately not probed.

**Files/components:** `backend/src/services/aiService.js:9`, sole provider registry; `backend/src/services/aiReliability.js:23`, retry/deadline policy; `docs/verification/2026-10-14/live-ai-evaluation.json`; `docs/verification/p0-resolution-2026-10-14/live-ai-evaluation.json` and `live-ai-metrics-interpreted.json`.

**Technical explanation:** There is no successful diagnosis without Gemini. The two stored October 14 runs returned zero valid outputs across 28 cases each. The later run had three AI_PROVIDER_ERROR and 25 AI_RATE_LIMITED failures; interpretation records a provider-reported daily free-tier limit of 20 and retry delay of 83,742 seconds. Current bounded retries cannot repair sustained quota exhaustion. This is an availability finding, not proof of bad diagnosis quality. The current code does not convert provider failure into benign noise, which is a useful safeguard.

**Realistic failure:** During an incident, every user analysis fails because provider quota is exhausted or generation is unavailable. Extra attempts consume time without restoring capacity.

**Recommended correction:** Review stored failures and configured capacity without generation calls, correct quota/error handling and operational visibility, and plan a later explicitly authorized availability evaluation. Do not silently switch models/providers or claim repaired availability from offline tests. A second provider would require a separate design and data-processing decision.

### F12 — Output completion and decision reproducibility lack sufficient diagnostics (P2)

**Status:** Confirmed limited metadata; long-output failures are a suspected risk.

**Files/components:** `backend/src/services/geminiProvider.js:143–160`, output cap, parse and providerMetadata; `backend/src/services/analysisService.js:47`, persisted decision metadata.

**Technical explanation:** Thirteen requested fields, including up to 20 excerpts and 20 steps per array, must fit 2,048 output tokens. The parser sees response.text without an explicit finish-reason check. Truncation fails closed as invalid JSON, but incomplete generation is not distinguished from schema violations. Stored providerMetadata contains provider, model and latency, not prompt/contract version or completion reason; token counts are logged separately. A model alias and prompts can change while old history/replays remain intact.

**Realistic failure:** A dense 16-KiB incident produces truncated JSON and no diagnosis. A future regression cannot be reliably attributed to prompt, contract, or model changes from the stored result alone.

**Recommended correction:** Capture completion diagnostics and versioned prompt/contract provenance without raw sensitive output. Establish an explicit concise response budget and test long responses with mocks. Any output-token change or actual long-input generation validation requires separately approved provider usage; offline transport tests can precede it.

## Explanation of the historical 4/11 result

Primary evidence: `docs/verification/2026-10-07/live-incidents.json` and `docs/verification/2026-10-07/ai-quality-review.json`; interpretation also appears in `docs/TRANSFORMATION_READINESS.md:48–54`. Despite the directory name, the reports contain UTC timestamps on October 8. The review explicitly says retrospective, no new provider calls, and same 11 stored responses.

| Case | Stored confidence | Allowed confidence | Outcome |
| --- | --- | --- | --- |
| recovered-legacy-noise | High | Low | Fail: recovery did not establish network/backend-delay cause |
| supported-service-impact | High | Low/Medium | Fail: impact and DB refusal did not establish why connectivity failed |
| insufficient-impact-context | Low | Low | Pass |
| log-instruction-injection | High | Low/Medium/High | Pass under permissive bound |
| deployment-rejected-with-recovery | Medium | Low | Fail: startup/probe/resource causes were speculative alternatives |
| docker-crash-loop | High | Low/Medium/High | Pass; explicit missing variable supports cause |
| kubernetes-image-pull | No returned result | Low/Medium/High | Provider failure, not an observed confidence error |
| ci-test-failure | No returned result | Low/Medium/High | Provider failure, not an observed confidence error |
| authentication-attack-blocked | High | Low/Medium | Fail: blocked failures did not prove credential stuffing/brute force |
| api-errors-recovered | Medium | Low | Fail: successful retry did not establish a network/backend glitch |
| benign-repetition | High | Low/Medium/High | Pass under permissive bound |

The original decision rubric passed **9/11**, and all nine returned decisions passed those original bounds. Five of those nine violated the stricter causal-confidence bounds. Thus **4/11 full-rubric passes = 11 − 2 provider failures − 5 confidence violations**. Conditional on a returned response, confidence-bound compliance was **4/9**, not 4/11. It is inaccurate to call the two unavailable cases overconfident outputs.

The result is not 36.4% real-world diagnostic accuracy, not a calibrated confidence measure, and not an independent second generation round. Three passing cases allowed every confidence value, so even 4/9 compliance is limited evidence. Current prompt text explicitly distinguishes cause confidence from event confidence; stored outputs predate the current full trust-field contract and cannot establish that the present prompt solved the problem. October 14 runs provided no valid outputs with which to measure a change.

## Five most important reliability risks

1. **False negatives on critical incidents:** selective valid evidence can support an accepted benign decision (F1), and missing evidence deterministically forces Low severity (F2).
2. **Unsupported causal certainty:** confidence and causal prose are controlled by Gemini without independent support checks; historical overconfidence is documented (F3/F4).
3. **Misleading noise/recovery interpretation:** mixed services, legacy lines, stale windows and untrusted messages can dominate interpretation; signals do not constrain generation (F5/F7).
4. **Unsafe recommended intervention:** destructive or mutating steps can pass as safe diagnostics; the product does not execute them, but users may (F6).
5. **Analysis unavailable during an incident:** historical all-failure runs and quota exhaustion demonstrate single-provider availability exposure (F11). Weak evaluation could conceal other regressions (F9/F10).

## Prioritized correction plan — approval required before implementation

1. **First: close unsafe decision acceptance.** Correct empty-evidence handling, enforce coherent decision fields, introduce impact/recovery provenance and conservative contradiction handling, and add explicit critical-as-noise regression cases. Address diagnostic loss in redaction alongside these safeguards (F1/F2/F8).
2. **Then: constrain cause confidence and action safety.** Separate observation from hypothesis, require causal support for High confidence, enforce safe diagnostic steps, and version the decision policy (F3/F4/F6).
3. **Strengthen input interpretation.** Compute signals before inference, preserve service/time scope and adverse evidence, improve untrusted-input separation, and cover malicious suppression and conflicting recovery (F5/F7).
4. **Repair the quality gate before claiming improvement.** Tighten fixture-specific expected outcomes, meaningful evidence coverage and unsafe-action checks; report conditional quality separately from availability; manually re-adjudicate stored responses (F9/F10).
5. **Establish operational readiness.** Improve completion/provenance metadata, review existing quota evidence and capacity configuration, then run a small, budgeted, explicitly approved live evaluation only after offline checks pass. Include multiple repeated rounds and realistic mixed/long excerpts; document availability, latency, false negatives, false positives, cause confidence and action safety separately (F11/F12).

These are proposed corrections, not implemented changes. A deterministic impact guard must be conservative and scoped; replacing the model with a few keyword rules would create additional false positives and false negatives.

## What can be fixed without additional Gemini API calls

After approval, contract handling, redaction preservation, decision consistency, confidence policy, recommendation safety checks, signal placement, prompt separation, version metadata, evaluator logic, fixture coverage and metric denominators can all be changed and verified locally. Use hand-authored and mutated model-response fixtures, mocked SDK responses, and re-scoring of stored outputs. Human review of existing responses also costs no Gemini quota.

Offline work can prove rejection of known unsafe outputs, preservation of evidence, and correctness of deterministic transformations. It cannot prove improved live model sensitivity/specificity, current provider availability, calibration, prompt-injection immunity, or production-scale latency. Those claims require later authorized evaluation and representative data; deployment and database changes are unnecessary for this audit or the initial local fixes.

## Verification performed during this audit

- Read the current analysis entry points, Gemini adapter, response contract, redactor, signal extractor, provider reliability wrapper, persistence mapping, result presentation, evaluator, fixtures, relevant unit tests, and stored quality/availability reports.
- Ran `node --test backend/test/analysisBoundary.test.js backend/test/logSignals.test.js backend/test/evaluation.test.js`: all three selected test-file entries passed. These files exercise local functions only; no provider SDK generation or database path was invoked. Passing existing tests does not refute the acceptance gaps above.
- Ran an ephemeral local Node script importing only analysisContract, logSignals, redactSecrets, and the evaluator/fixture modules. The evaluator was imported, not executed as a live evaluation. It reproduced acceptance of critical-as-noise, generic evidence, empty-evidence downgrade and destructive recommendations, plus the weak required-evidence score and redaction evidence loss. No reproduction script or test source was added to the repository.
- The synthetic adverse-response reproductions establish what the contract permits. They are not fabricated claims of historical Gemini behavior. No production incident or live critical-as-noise output was established from the inspected stored reports.

**Phase 1 recorded implementation status:** Audit only. Awaiting user approval before any code fixes. This describes the original audit snapshot; see the dated Phase 2 update below.

## Phase 2 implementation update — 2026-10-28

The user authorized backend implementation and local verification after this audit. The original findings and historical evidence above are preserved. Their descriptions of the former request path and contract are historical, not descriptions of the hardened implementation.

Seven findings have their confirmed defect mechanisms corrected for newly generated decisions: **F1, F2, F3, F4, F6, F8 and F10**. Five remain open in whole or part: **F5, F7, F9 and F12 are partially mitigated; F11 remains open**. “Corrected” is a bounded engineering status, not proof of diagnostic accuracy or immunity to all semantically equivalent failures.

| Finding | Implementation status | Backend correction / remaining limitation |
| --- | --- | --- |
| F1 | Corrected for new generation | Whole-source observations, complete-line evidence and a closed benign-decision policy prevent selective healthy quotes from authorizing noise. Supported request failures override the candidate decision. Log authenticity and unknown-format impact remain unverified. |
| F2 | Corrected for new generation | Empty/generic candidate evidence no longer hides recognized source impact. Policy reconstructs support; unknown excerpts use provisional Medium/Insufficient Evidence rather than an automatic Low. Noncritical diagnostic-only warnings can remain Low/Investigate, explicitly marked impact-unverified. |
| F3 | Corrected acceptance mechanism | Cause confidence is Low by default, at most Medium for independently recognized direct error diagnostics. Model High is never inherited. These labels are intentionally conservative and remain uncalibrated. |
| F4 | Corrected acceptance mechanism | Unverified model diagnosis, recovery and next-step prose is replaced with source-derived, window-scoped observations and diagnostic guidance. Unknown causes remain unknown; general semantic entailment is not solved. |
| F5 | Partially mitigated | Signals are computed before generation, repeated/old lines never independently establish harmlessness, and a narrow subject/time/count-based recovery exception is tested. General service correlation, timestamp formats and recovery patterns remain limited. |
| F6 | Corrected acceptance mechanism | Closed diagnostic grammar classifies unknown or mutating proposals for explicit human review. Raw candidate commands are removed, verification is canonical/read-only, approval and backup warnings are shown. There is no remediation executor. |
| F7 | Partially mitigated | Separate SDK system instruction and serialized untrusted JSON replace spoofable policy/data delimiters. Deterministic post-validation limits suppression. This does not establish log authenticity or universal injection immunity. |
| F8 | Corrected reported defect | Authorization diagnostics retain failure counts; genuine headers/credential fields still redact, with idempotent placeholders. Arbitrary secrets and broad format-aware loss detection remain best-effort. |
| F9 | Partially mitigated | Reverse substring matching is removed, full-line/impact evidence is required, operational fixture bounds are tightened, and adversarial regressions were added. Keyword usefulness proxies and the small synthetic corpus remain insufficient for diagnostic-quality claims. |
| F10 | Corrected metrics | Availability and conditional quality use separate denominators; no outputs yields null quality metrics; over/underconfidence are separate. |
| F11 | Open | No provider probe, quota use or configuration change was performed. Single-provider availability and historical quota failures remain unresolved. |
| F12 | Partially mitigated | Policy/prompt/contract version, finish reason and usage metadata are retained; non-STOP completion fails closed; concise output is requested without increasing token limits. Actual long-output reliability and omitted finish reasons remain unverified. |

Implementation and regression details are in [AI_ENGINE_FIX_REPORT.md](AI_ENGINE_FIX_REPORT.md). Offline stored-response replay is recorded in [AI_ENGINE_STORED_REPLAY.json](AI_ENGINE_STORED_REPLAY.json). The retrospective 4/11 result above remains historical; the replay is not a new live evaluation.

Verification: 160/160 backend tests; 31/31 isolated PostgreSQL 18 integration tests; backend syntax check and 28 fixture definitions valid; frontend lint, TypeScript check and production build passed. Sandbox-restricted runs were superseded by successful unrestricted local test runs where needed. No Gemini calls, production database changes, migrations against a shared database, deployment or automatic remediation occurred.

One known conservative replay deviation is preserved: the stored injection case becomes Medium/Investigate and fails its original Low-only severity bound. Historical database records and completed idempotency replays are not backfilled or reclassified by this change. They can still expose older unsafeguarded assessments; new metadata identifies the new policy, but this is not a history migration.

**Current status:** Backend hardening implemented and locally verified; no commercial-readiness claim. Representative live sensitivity, specificity, usefulness, calibration, long-output behavior and provider availability still require separately authorized evaluation.
