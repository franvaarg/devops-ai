# KANYI comprehensive AI reliability validation

Date: 2026-10-28. Baseline commit: `f6daf77d2074e42f2c344bdf1e2767a5cdb90f9f`.

## Verdict and scope

| Question | Verdict | Evidence and boundary |
| --- | --- | --- |
| Can KANYI accurately distinguish real incidents from harmless noise? | **NOT VERIFIED** for real-world diagnosis | VERIFIED OFFLINE: 49 synthetic scenario expectations and 147 scripted candidate variants pass after correction. No current live Gemini generation or representative production-log evaluation was performed. |
| Does confidence correspond to available evidence? | **NOT VERIFIED** for empirical calibration | VERIFIED OFFLINE: 49/49 support-label expectations pass, with 37 Low, 11 Medium and 1 High. This measures rule compliance, not observed probability calibration or independently adjudicated real root causes. |
| Can it handle provider errors, quotas and concurrent requests reliably? | **PASS — VERIFIED OFFLINE**, bounded fault-handling scope | 11/11 transport fault scenarios and 35/35 real isolated PostgreSQL integration tests pass, including HTTP reservation release, SQL insert failure, request IDs, concurrency and account isolation. Live provider availability/capacity and multi-instance throughput remain NOT VERIFIED. |

**KANYI is not declared production-ready or commercially ready.** The perfect post-correction synthetic score is an in-sample engineering regression result. It is not Gemini accuracy, a blind test, a representative customer study, or evidence of universal incident detection. No production data was accessed or modified; no push, deployment or automatic remediation occurred.

## 1. Baseline verification

HEAD and the initially clean working tree matched the cited commit. The complete audit, Phase 2 fix report, transformation-readiness report and `red.md` were inspected before correction. Fresh baseline runs reproduced **160/160 backend tests and 31/31 PostgreSQL tests**. The old 28-fixture suite remained present. Its fixture validation checks definitions, not model quality; historical 4/11 confidence review and October 14 provider failures were not accepted as current measurements.

Baseline code inspection confirmed three important constraints: a global Medium cause-confidence cap, extensive replacement of model prose, and a narrow plaintext/cache-specific observation policy. Source provenance checks were stronger than diagnostic coverage. New tests were necessary to evaluate false dismissals, useful diagnoses and underconfidence as well as unsafe certainty.

## 2. Methodology and reproducible artifacts

**VERIFIED OFFLINE:** [reliability-cases.cjs](../../backend/scripts/reliability-cases.cjs) defines 49 engineer-authored synthetic scenarios. Each includes explicit expected severity, actionability, false-positive risk, cause-confidence level, truth category, support-line indices, plausible proximate-cause criterion, useful read-only diagnostic criterion, and a written rationale. These expectations come from the scenario facts and engineering assumptions, not a Gemini answer. There was no external independent adjudicator; author/reviewer bias remains a limitation.

The benchmark sends three fixed proposals through the real backend `parseAnalysis`/safety path for each source:

1. Neutral: Medium/Investigate/Medium, first-line evidence and a generic read-only proposal.
2. Dismissive: Low/Likely Noise/High, invented cause/recovery and `DROP DATABASE` as the recommendation.
3. Cautious: Low causal confidence and empty evidence, otherwise the same proposal across cases.

Candidate construction never reads expected outcomes. The test therefore evaluates the **contract and deterministic safety policy under controlled proposals**, not Gemini's ability to generate an answer. It proves neither end-to-end generative quality nor the model's raw confidence calibration. The mocked SDK boundary is tested separately, including typed JSON impact passing through the actual adapter.

Baseline outputs were saved before changing the engine. The negated-memory cause grader was subsequently strengthened to exclude a fabricated memory diagnosis; the expected labels/rationale did not change. Baseline outputs were re-scored without rerunning the modified engine as the baseline. The baseline and final artifact share dataset SHA-256:

`c5bd26b74626fca32745d7e5c8eed76c6d22b11b0d3cf7609d03a2f6f820c212`

The complete before/after results, matrices and individual outputs are in:

- [benchmark-baseline.json](ai-reliability-2026-10-28/benchmark-baseline.json) and [benchmark-final.json](ai-reliability-2026-10-28/benchmark-final.json).
- [operations-baseline.json](ai-reliability-2026-10-28/operations-baseline.json) and [operations-final.json](ai-reliability-2026-10-28/operations-final.json).
- [policy-latency.json](ai-reliability-2026-10-28/policy-latency.json) and [verification-summary.json](ai-reliability-2026-10-28/verification-summary.json).
- Security audit snapshots for [backend before](ai-reliability-2026-10-28/security-backend-baseline.json), [backend after](ai-reliability-2026-10-28/security-backend-final.json), [frontend before](ai-reliability-2026-10-28/security-frontend-baseline.json), and [frontend after](ai-reliability-2026-10-28/security-frontend-final.json).

Offline reproduction, from the repository root:

```sh
node backend/scripts/validate-ai-reliability.cjs --output /tmp/kanyi-policy-benchmark.json
node backend/scripts/validate-ai-operations.cjs --output /tmp/kanyi-transport-faults.json
```

Neither runner imports an AI SDK, database connection or `.env`. They have no live-generation mode. Regression tests also vary service names, variable names, field order, representation, environments, payloads and operation IDs. These are metamorphic checks, **not an independent held-out customer dataset**.

## 3. Dataset composition and assumptions

All inputs are explicitly synthetic. No customer, production or incident-ticket collection is implied.

| Category | Cases | Category | Cases |
| --- | ---: | --- | ---: |
| Docker | 3 | Kubernetes | 2 |
| PostgreSQL | 2 | Connection pools | 2 |
| API failures | 3 | Authentication | 2 |
| Authorization | 1 | Memory | 3 |
| Disk | 2 | CI/CD | 2 |
| Network/DNS | 2 | Legacy | 2 |
| Benign recurring observations | 3 | Injection | 3 |
| Incomplete/malformed | 2 | Contradictory | 4 |
| Structured representations | 3 | Recovery | 4 |
| False-positive boundaries | 2 | Confidence scope | 1 |
| Near-limit mixed excerpt | 1 | **Total** | **49** |

Severity targets: 8 Critical, 4 High, 31 Medium, 6 Low. Actionability targets: 13 Action Required, 30 Investigate, 5 Likely Noise, 1 Insufficient Evidence. The Low legacy warning still requires investigation; Low is not synonymous with harmless. Truth categories distinguish 13 supported incidents, 5 benign windows, 30 ambiguous excerpts and 1 insufficient excerpt.

Ground-truth assumptions:

- Logs describe a supplied observation window; successful probes/rollbacks cannot establish present health or recovery of unrelated services.
- Explicit failed-request measurements, unavailable desired core production replicas, and a write failure corroborated by zero free space establish bounded impact. Labels such as ERROR, payment or fatal alone do not.
- For this benchmark, direct diagnostics can support a proximate mechanism without explaining its deeper cause. Missing configuration plus a separate same-service configuration observation supports High **for that proximate startup explanation in the supplied window**. It is not certainty about who changed the configuration or current health. Corroboration from another service does not count; contradictory configuration lowers confidence.
- No timestamps means recovery chronology is unverified. Missing timestamps do not erase a direct diagnostic observation, but prevent the scoped-recovery exception.
- Conflicting aliases/duplicate keys cannot defensibly establish either a benign window or an outage until resolved.
- Source format is not evidence strength: typed flat JSON and quoted service identifiers should preserve the same observations. Payload strings must not be recursively promoted into metrics.
- These assumptions are bounded engineering labels, not statistically calibrated probabilities or verified log authenticity. JSON nesting, unsigned/forged logs, service-specific SLOs and many causal mechanisms remain outside measured coverage.

## 4. Diagnostic results — VERIFIED OFFLINE only

The table uses one neutral candidate per distinct case. The final three-candidate run also passed all checks across **147/147 variants**. The 49 cases were used to guide corrections, so final success is in-sample; it cannot establish out-of-sample diagnostic accuracy.

| Criterion | Baseline | Final |
| --- | ---: | ---: |
| Severity target | 39/49 (79.6%) | 49/49 |
| Actionability target | 38/49 (77.6%) | 49/49 |
| False-positive-risk target | 39/49 (79.6%) | 49/49 |
| Literal evidence provenance | 49/49 | 49/49 |
| Required material support cited | 35/49 (71.4%) | 49/49 |
| Proximate-cause plausibility rubric | 41/49 (83.7%) | 49/49 |
| Read-only remediation usefulness rubric | 38/49 (77.6%) | 49/49 |

Cause/usefulness criteria are explicit textual proxies against scenario facts. They are stricter than mere nonempty fields, but not a substitute for blind human causal/usefulness review. The safe action renderer still intentionally omits arbitrary shell commands and free-form proposals.

### Severity confusion matrices

Rows are expected severity, columns are returned severity. Entries show **baseline → final** counts.

| Expected \ Returned | Low | Medium | High | Critical |
| --- | ---: | ---: | ---: | ---: |
| Low | 3 → 6 | 3 → 0 | 0 → 0 | 0 → 0 |
| Medium | 2 → 0 | 29 → 31 | 0 → 0 | 0 → 0 |
| High | 0 → 0 | 1 → 0 | 3 → 4 | 0 → 0 |
| Critical | 0 → 0 | 4 → 0 | 0 → 0 | 4 → 8 |

### Actionability confusion matrices

| Expected \ Returned | Action Required | Investigate | Likely Noise | Insufficient Evidence |
| --- | ---: | ---: | ---: | ---: |
| Action Required | 8 → 13 | 4 → 0 | 0 → 0 | 1 → 0 |
| Investigate | 0 → 0 | 27 → 30 | 2 → 0 | 1 → 0 |
| Likely Noise | 0 → 0 | 2 → 0 | 2 → 5 | 1 → 0 |
| Insufficient Evidence | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 1 |

### False positives and false negatives

- **Critical-as-harmless:** 0/8 neutral cases before and after; 0/24 critical proposal variants before and after. This separate safety measure must not conceal undertriage.
- **Critical undertriage:** baseline 4/8, final 0/8. Missing configuration with unavailable replicas, CrashLoopBackOff with unavailable replicas, JSON metrics and quoted logfmt identifiers were incorrectly downgraded to Medium before correction.
- **Supported incidents lacking Action Required:** baseline 5/13, final 0/13. Disk write/capacity failure was also missed.
- **Ambiguous records incorrectly called noise:** baseline 2/30, final 0/30. Duplicate failure counters and conflicting aliases caused the false dismissals. These are ambiguous gold labels, not proven critical incidents; they still expose an unsafe benign-acceptance path.
- **Benign windows unnecessarily escalated to investigation/insufficiency:** baseline 3/5, final 0/5. Successful scheduled jobs, structured probes and a correctly scoped retry were over-conservative.
- **Benign windows incorrectly Action Required:** 0/5 before and after. Unknown/missing context remains investigation, not a fabricated Critical result.

## 5. Confidence results — support compliance VERIFIED OFFLINE; statistical calibration NOT VERIFIED

Confidence is evaluated separately from severity/actionability and from the cause plausibility check. A diagnosis may correctly identify impact while its cause remains Low confidence. The confidence scorer penalizes both unsupported certainty and unnecessary conservatism; returning Low for every case cannot pass.

| Expected \ Returned | Low | Medium | High |
| --- | ---: | ---: | ---: |
| Low | 35 → 37 | 2 → 0 | 0 → 0 |
| Medium | 6 → 0 | 5 → 11 | 0 → 0 |
| High | 0 → 0 | 1 → 0 | 0 → 1 |

Support-label agreement improved from **40/49 to 49/49**. Overconfidence violations fell from **2 to 0**; underconfidence violations from **7 to 0**. Final distribution: **37 Low, 11 Medium, 1 High**; all three proposal variants produce the source-supported label even when the candidate says Low or High. Direct source support can therefore raise a cautious candidate's confidence, rather than only reducing confidence.

The former blanket cap and dependence on Gemini's proposed confidence were removed. Direct configuration, allocation, authentication, DNS, pool, authorization, runtime and dependency diagnostics retain bounded useful explanations. Negated memory text no longer creates a memory cause. Same-service contradictory audits override corroboration; different-service evidence does not corroborate. Multiple mechanisms retain causal uncertainty. Recovery prose remains scoped and independently supported.

The confidence-bin artifacts count plausibility-rubric success and target-label agreement. They are **not empirical reliability diagrams**: no numeric confidence probabilities were assigned, no Brier/ECE score is justified, no independent real-cause outcomes were obtained, and only one primary scenario targets High. The source can be wrong or forged. Larger blind data and adjudicated outcomes are required before claiming calibration.

## 6. Operational reliability — VERIFIED OFFLINE

Transport fault scenarios improved from **8/11 to 11/11**. Mocks and injected clocks establish contracts, not Google service uptime.

| Fault/condition | Measured final behavior |
| --- | --- |
| 503 recovery and request IDs | 3 attempts; 500/1,000 ms backoff; same async request ID throughout |
| Temporary 429 | Honors 2-second RetryInfo; 2 attempts |
| Daily quota metric with short RetryInfo | **1 attempt, no wait/retry**, versus 3 attempts before correction |
| Sustained 503 outage | Stops after 3 attempts; no fake successful/noise result |
| RetryInfo beyond deadline | 1 attempt; no early retry or over-budget wait |
| Transport ignores cancellation | **1 attempt, maximum 1 unsettled transport**, versus 3 overlapping transports before correction |
| Transport cooperates with timeout | Cancellation settles first attempt, second recovers; maximum concurrency 1 |
| Caller cancellation | 1 attempt; never retries; already-cancelled work remains covered by existing zero-call regression |
| Overall deadline | Attempt budgets 20,000/20,000/3,500 ms plus backoff consume 45,000 ms injected time |
| Malformed error details | 5 malformed forms handled without classification crashes (including non-string coercion fields) |
| Parallel request contexts | 16 requests, 32 total attempts, no request-ID cross-contamination |

The existing timeout-recovery mock was corrected to actually settle on abort; its recovery/abort/attempt-count assertions remain. A separate noncooperative regression now rejects the formerly unsafe overlap. Jitter has an additional exact-bound regression (749/1,249 ms at a fixed random value). No test was relaxed to accept the old timeout behavior.

The installed `@google/genai` 2.10.0 `apiCall` implementation was also inspected locally: absent `httpOptions.retryOptions`, it returns one `fetch`; SDK retry machinery is entered only when that option is supplied. The existing mocked-adapter assertion confirms KANYI does not supply it. This verifies the local no-nested-retry configuration, not actual Google execution/billing behavior.

Malformed-response coverage was strengthened from three structural forms to five samples, including non-string status/message/delay/quota fields that previously threw during implicit coercion. Cancellation tests use an explicit AbortSignal. By existing design, HTTP disconnect alone does not cancel admitted analysis: bounded work may finish for same-key recovery. Neither browser disconnect nor local transport settlement guarantees that upstream work/billing stopped.

The PostgreSQL suite runs a private temporary PostgreSQL 18 cluster with TCP disabled and rejects remote/shared targets. Final **35/35 tests pass**, including existing transaction/lock/quota/replay/account tests and four added HTTP workflows:

- Provider failure: safe 503, one provider invocation, matching public/header/async request ID, no persisted analysis, no monthly charge, reservation released, failed key cannot run again.
- Test-only SQL trigger raises disk-full `53100` during INSERT: transaction and usage roll back, reservation is released, sensitive error text is hidden, failed key stays terminal, a fresh key works after removing the trigger.
- Sixteen concurrent HTTP requests at the last monthly slot: exactly one provider invocation and saved analysis; one 201 and fifteen quota 429 responses; usage ends at 50.
- Same request key in two accounts: distinct saved results, owner-only history, cross-account deletion returns 404 and preserves the other result.

The fault trigger exists only in the isolated integration test and is removed. No application migration or production data change is introduced. This is not a multi-instance load test, disaster recovery exercise or proof of upstream exactly-once billing. Provider-side work/cost may continue after local cancellation settles.

## 7. Live Gemini status and budget

**NOT VERIFIED LIVE. Actual generation requests: 0. Actual Gemini cost: $0.** No current model-list/generation probe was used to infer quota. Local inspection established only that a key is present, the default Gemini adapter/model is selected, Cloud project quota identity/access is unavailable, and billing tier/remaining allowance cannot be verified. No secret values were printed or stored.

The stored October 14 evidence reports 28 failures, a historical free-tier daily limit of 20 and a retry delay of 83,742 seconds. This is historical evidence, **not today's remaining quota**. Model listing would not prove free-tier billing or remaining generation capacity.

The active budget was therefore **zero requests / zero dollars**. A conditional future smoke-test budget is **at most three actual HTTP generation attempts, one at a time, no automatic retries, at most 2,048 output tokens per request and $0 paid spend**, only after an operator verifies remaining free-tier request/token/rate capacity. Stop on the first quota, timeout or provider-unavailability error. Any paid capacity or nonzero cost requires separate user approval before a call. Do not run the existing 28-case live script under that three-attempt budget; its retries could exceed it.

Even three successful live cases would be a smoke test, not sufficient diagnostic/calibration evidence. No live availability, latency, useful-cause accuracy, false-negative rate, quota capacity or long-output completion claim is made.

## 8. Latency observations

| Measurement | p50 | p95 | Maximum | Scope |
| --- | ---: | ---: | ---: | --- |
| Final 147-variant harness | 0.579 ms | 3.544 ms | 65.301 ms | Proposal serialization, contract/policy and rubric grading under concurrent verification load; excludes provider/DB |
| Baseline policy, interleaved microbenchmark | 0.054 ms | 0.289 ms | 9.357 ms | 490 samples, one warmup round, ten alternating engine-order rounds on identical inputs |
| Final policy, same microbenchmark | 0.165 ms | 2.215 ms | 47.602 ms | Same 490-sample method; direct policy only |
| Successful HTTP analysis | 57 ms | 436 ms | 436 ms | 11 real Express/PostgreSQL responses with a stubbed provider |
| HTTP provider/SQL failure | 70 ms | 72 ms | 72 ms | 2 safe 503 responses with reservation cleanup |
| HTTP quota rejection | 259 ms | 379 ms | 379 ms | 15 concurrent last-slot rejections, including admission lock contention |

The new parser adds measured CPU overhead; the direct-policy p95 increased from 0.289 to 2.215 ms. This is an observed performance cost, not a performance-improvement claim. The harness includes scoring overhead and transient host contention; it is not customer response time. HTTP concurrency tests include an artificial 10 ms provider delay. Successful 503 recovery consumes **1,500 ms injected backoff**, temporary 429 recovery **2,000 ms**, and exhausted deadline testing **45,000 ms virtual elapsed time**. Virtual time and local wall time are reported separately. Live service percentiles and throughput SLOs remain NOT VERIFIED.

## 9. Reproducible defects corrected

| Priority / defect | Root cause and correction | Files and regression coverage |
| --- | --- | --- |
| P0 benign-acceptance safety exposure: conflicting counters | First-match regexes accepted duplicate/alias failure counts as a benign window. Atomic field parsing and normalized duplicate detection now require investigation; payload contents never supply counters. No proven Critical gold case was observed as noise. | `backend/src/services/logObservations.js`, `analysisSafety.js`; duplicate logfmt/JSON/alias cases and metamorphic payload/unknown-field tests |
| P1 structured impact undertriage | Global quote exclusion discarded ordinary JSON and quoted identifiers. Parse flat JSON/logfmt metadata independently of payload text; preserve source lines and valid measured impact. | Same normalizer/policy; JSON critical, quoted identifier, SDK adapter mock, reordered/case-varied fields and arbitrary service names |
| P1 non-request impact ignored | Only request counters triggered Action Required. Add scoped desired/ready replica availability and ENOSPC write failure corroborated by zero free bytes. Core production unavailability can be Critical; disk failure is High without assuming total outage. | Normalizer and `backend/src/services/diagnosticSupport.js`; Docker/Kubernetes/disk cases plus staging/production transformations |
| P1 unsupported causes and incomplete evidence | Substring memory matching ignored negation; useful direct errors were replaced with generic insufficiency; recovery/corroboration facts could be omitted from evidence. Recognize bounded diagnostics, causal negation, contradiction and support lines together; retain guarded explanations and targeted read-only guidance. | Diagnostic support/policy; negated OOM, memory/configuration, pool, scope, dependency, TypeError, DNS, source-support and multi-mechanism tests |
| P1 post-normalization output overflow | A 3,954-character source line could produce a 4,047-character diagnosis after adding corroboration prose, exceeding the public 4,000-character bound. Final generated text/array limits are rechecked before persistence; oversized output fails closed. | `analysisSafety.js` and a long-identifier regression; no quota-consuming live call or persisted malformed response was needed to reproduce it |
| P1 provider retry amplification | Daily quota recognition inspected only a limited ID spelling; malformed detail arrays could throw. Normalize ID/metric spelling and validate object/array shapes; hard quotas terminate. | `backend/src/services/aiReliability.js`; unchanged 429/503/auth/deadline contracts plus daily metric and malformed-response fault injection |
| P1 unsettled timeout overlap | Timeout aborted transport but immediately allowed retries while the old promise remained live. Track settlement, allow only bounded remaining-budget cancellation grace, then fail without retry if unsettled. Original amplification was bounded to three attempts, not an infinite retry loop. | Reliability service, `backend/test/aiReliability.test.js`, operational runner and regression; maximum concurrent unsettled attempts drops from 3 to 1 |
| P2 excessive conservatism | Blanket confidence cap/candidate dependence, cache-specific recovery and limited benign formats lost useful distinctions. Source-based Low/Medium/High, same-operation/time-scoped recovery, successful job/probe recognition and targeted diagnostics preserve supported conclusions. Unknown fields/context remain conservative. | Diagnostic support/normalizer/policy; all confidence strata, mismatched service/operation/time, benign recurring jobs and missing-timestamp tests |
| Security advisory remediation | Fresh npm audits found three affected packages per project, invalidating old zero-advisory assumptions. Compatible updates within existing dependency ranges remove reported advisories; exploitability of every advisory in KANYI was not independently demonstrated. | Backend/frontend lockfiles; body-parser 2.4.0, ip-address 10.7.5, qs 6.17.0, DOMPurify 3.4.17, Vite 8.3.5, Zod 4.6.7 plus required transitives; final tests/build/audits |

No benchmark case ID, service name or expected answer is read by the engine. Runtime rules operate on log fields, bounded diagnostic signatures, temporal/operation relationships and source support. The old cache compatibility rule remains for existing behavior. This still represents limited authored domain knowledge, not a general causal proof engine.

## 10. Regression and security results

| Check | Result |
| --- | --- |
| Baseline backend / PostgreSQL | 160/160; 31/31 reproduced |
| Final backend unit/API/contract/fault tests | **223/223 passed**, zero failures/skips/cancellations |
| Final PostgreSQL integration | **35/35 passed**, private PostgreSQL 18 cluster removed afterward |
| New benchmark | 49 unique scenarios / 147 proposal variants pass all declared checks |
| Transport fault scenarios | 11/11 pass, zero real provider calls |
| Existing AI fixtures | 28 definitions valid; not a live evaluation |
| JavaScript syntax | `npm run check` passed |
| Frontend lint / TypeScript / production build | All passed after dependency updates; no frontend feature source changed |
| Backend npm audit | 3 affected packages before (1 high, 2 moderate); **0 after** |
| Frontend npm audit | 3 affected packages before (1 critical, 2 high); **0 after** |
| Repository whitespace/change review | `git diff --check` passed before staging |

HTTP/PostgreSQL tests ran outside sandbox socket restrictions. Registry audits initially failed sandbox DNS and were rerun successfully with network access. Package lifecycle scripts were disabled during updates. Only compatible dependency ranges were used; no major migration, service installation, application feature rebuild or deployment occurred. Existing tests remained; the noncooperative timeout behavior was corrected and independently tested rather than accepted. The new benchmark first exposed four cautious-variant evidence gaps; they were fixed, not suppressed by changing the expectations. Backend has no separate lint/static-type/build script; its JavaScript syntax and unit/API/integration checks were run.

## 11. Remaining risks and recommended actions

1. Obtain operator-verifiable free capacity and billing evidence, then conduct only the budgeted live smoke test. Provider outages, actual quotas and upstream billing/cancellation behavior remain unknown. A second provider/model switch is not implemented or justified by this study.
2. Establish a separately adjudicated, representative and consented customer-log corpus with unseen cases. Test beyond the corrected in-sample set, especially confirmed security breaches, data loss, mixed-service recovery, long/multiline/nested JSON logs and logs whose metrics are misleading or forged.
3. Evaluate causal correctness and confidence using independently known outcomes. Review whether same-service configuration corroboration justifies High under real multi-instance/timing conditions. Do not map labels to probabilities or advertise calibration from this benchmark.
4. Review severity thresholds against actual service SLOs and impact scope. The inherited 20-failure/50%-rate heuristic and explicit core-service metadata are not universally valid severity boundaries. Partial failures below that threshold can still be operationally serious.
5. Measure live latency, token use across failed attempts, throughput and global provider budgets. Local no-overlap protection cannot guarantee upstream exactly-once execution. Per-process rate limits and individual-user quotas do not establish a shared provider budget across instances/users. More parsing adds CPU cost.
6. Design safe presentation/revalidation of old history and completed idempotency replays. This work does not backfill production records; older decisions/advice remain available without the latest policy.
7. Maintain human review of mutations and source truth. Free-form causal/action specificity is still constrained, which can reduce usefulness. Flat structured events, bounded negation grammar and recognized diagnostic signatures do not solve universal natural-language entailment, prompt injection, log authenticity or root-cause completeness.
8. Complete representative long-output generation and provider-readiness evaluation later. The 2,048-token output cap and UNREPORTED finish reasons remain limitations; a long **input** passing offline policy tests does not establish live output completion.

The original five partially/open audit concerns are not all closed by this validation. Results establish specific offline mechanisms and regressions; they do not remove external capacity, empirical accuracy/calibration, historical-data or deployment release gates.
