// This policy recognizes a bounded set of observations, not arbitrary causal truth.
// Unknown formats fail conservatively to investigation; counters/words alone do not
// prove an outage. Context and quoted external payloads are never impact evidence.
const { observations } = require('./logObservations');
const { diagnosis, scopedRecovery, resourceImpact, diagnosticFor, DIAGNOSTICS } = require('./diagnosticSupport');
const POLICY_VERSION = '2026-10-28.2';
const readOnlyStep = 'Inspect service health, error rates and adjacent timestamped logs using read-only tools.';
const reviewMessage = 'Human review required: do not execute proposed changes. Obtain owner approval and verify backups and rollback procedures before any mutation; destructive changes can cause data loss.';

function recoveredWindow(rows) {
  // Narrow, auditable recovery exception: matching cache-refresh subject, ordered
  // explicit timestamps, successful retry after the last failure, and a final
  // positive request count with zero failures. An unrelated healthy service, a
  // bare 'recovered' word, or unmeasured/unsorted excerpts cannot satisfy this.
  if (!rows.length || rows.some((row, i) => !row.eligible || !Number.isFinite(row.clock) || row.clockType !== rows[0].clockType || (i && row.clock < rows[i - 1].clock))) return false;
  const last = rows.at(-1);
  if (!/^INFO healthcheck healthy; [1-9]\d* requests served; 0 failed$/.test(last.body)) return false;
  const failures = rows.filter(row => /^ERROR cache refresh timeout; retry scheduled$/.test(row.body));
  if (!failures.length) return false;
  const retry = rows.findLast(row => /^INFO cache refresh retry succeeded$/.test(row.body));
  if (!retry || retry.line <= failures.at(-1).line || retry.clock <= failures.at(-1).clock || last.clock < retry.clock) return false;
  return rows.every(row => /^(?:WARN legacy cache API deprecated; compatibility mode enabled|ERROR cache refresh timeout; retry scheduled|INFO cache refresh retry succeeded|INFO healthcheck healthy; [1-9]\d* requests served; 0 failed)$/.test(row.body));
}

// Reject arbitrary substrings as support. Permit multiple complete lines in one
// excerpt, and indentation differences, but never turn 'ERROR' into a whole event.
function supportedEvidence(evidence, source) {
  const lines = new Set(source.split(/\r?\n/).map(line => line.trim()).filter(Boolean));
  return evidence.filter(excerpt => excerpt.split(/\r?\n/).every(line => line.trim().length >= 8 && /\s/.test(line.trim()) && lines.has(line.trim())));
}

function safeDiagnostic(text) {
  // Closed grammar, rather than an ever-growing destructive-command blacklist.
  // Unknown syntax (including tools, shell operators, mutations or embedded
  // claims) requires human review. Free model actions are never executed/echoed.
  const canonical = Object.values(DIAGNOSTICS);
  return canonical.includes(text) || /^(?:check|verify|inspect|review|confirm|monitor|collect) (?:the )?(?:service metrics|service health|health|availability|configuration|adjacent logs|logs|database health|error rates|latency metrics|deployment configuration)(?: using read-only tools)?\.?$/i.test(text.trim());
}

function applySafety(value, source) {
  const rows = observations(source);
  resourceImpact(rows);
  const impact = rows.filter(row => row.impact);
  const issues = rows.filter(row => row.adverse || row.dbFailure || row.authFailure || row.requestError);
  const recovered = recoveredWindow(rows) || scopedRecovery(rows);
  const benign = (rows.length > 0 && rows.every(row => row.benign)) || recovered;
  const supported = supportedEvidence(value.evidence, source);
  const cause = diagnosis(rows);
  // Prioritize adverse observations over the model's choice of a healthy line.
  const support = [...impact.filter(row => row.critical), ...(cause ? cause.support : []), ...impact, ...impact.flatMap(row=>row.resourceSupport?[row.resourceSupport]:[]), ...issues, ...rows.filter(row=>row.diagnostic)];
  value.evidence = [...new Set([...support.map(row => row.text), ...supported])].slice(0, 20);
  // Contract limits must also apply to evidence added by policy.
  if (value.evidence.some(line => line.length > 4000)) {
    throw Object.assign(new Error('Safety evidence exceeds contract bounds.'), { code: 'AI_INVALID_RESPONSE' });
  }

  const hasEvidence = value.evidence.length > 0;
  const critical = impact.some(row => row.critical);
  const minorWarnings = issues.length > 0 && issues.every(row => /^WARN legacy [\w .-]+ deprecated; compatibility mode enabled$/.test(row.body));
  const severity = critical ? 'Critical' : impact.some(row => row.major) ? 'High' : impact.length ? 'Medium' : benign || minorWarnings ? 'Low' : 'Medium';
  value.severity = severity;
  value.actionability = impact.length ? 'Action Required' : benign && hasEvidence ? 'Likely Noise' : !value.evidence.length ? 'Insufficient Evidence' : 'Investigate';
  value.falsePositiveRisk = impact.length ? 'Low' : benign ? 'High' : 'Medium';
  value.summary = impact.length
    ? 'Source-backed operational observations in the supplied window establish service impact. Recovery and current health require independent verification.'
    : benign && hasEvidence ? recovered ? 'The supplied ordered window shows retry success for the same operation followed by served requests with zero failures. Present health is unverified.' : 'The supplied window contains only successful health or request observations.'
      : 'The supplied excerpt does not establish the extent of impact. Investigation is required; current health and recovery are unverified.';
  value.noiseAssessment = impact.length
    ? 'Adverse impact observations prevent a benign dismissal. Other successful events do not establish recovery for the affected service.'
    : benign && hasEvidence ? recovered ? 'Matching scoped retry success and subsequent zero-failure request counts support benign recovery in this supplied window only.' : 'Only successful observations are present in this excerpt; this does not establish health beyond the supplied window.'
      : 'Legacy labels, repetition, old timestamps and unrelated healthy events do not establish harmlessness or recovery.';

  // Cause confidence refers to cause, not certainty that a failure was observed.
  // Direct diagnostics support Medium; independent, same-service corroboration
  // supports High. Contradiction overrides it. The candidate label is not proof.
  value.rootCause = cause ? cause.explanation : rows.some(row => row.dbFailure)
    ? 'Possible database connection failure is reported. The underlying cause is unverified.'
    : 'Insufficient evidence to determine a root cause.';
  value.confidence = cause ? cause.confidence : 'Low';

  const proposed = [value.recommendation, ...value.steps, ...(value.verificationSteps || [])];
  const humanReview = proposed.some(step => !safeDiagnostic(step));
  // Even a read-only-sounding model action can embed unsupported recovery or
  // causal claims. Render verified diagnostic guidance instead of free prose.
  const diagnostic = diagnosticFor(rows,cause);
  value.recommendation = humanReview ? reviewMessage : diagnostic;
  value.steps = humanReview ? [diagnostic, reviewMessage] : [diagnostic];
  value.verificationSteps = [diagnostic];
  // Free prose in trust fields is also unverified, so do not retain model assertions.
  value.missingInformation = ['Current service impact, affected scope and independently verified recovery.', 'Evidence identifying the underlying cause before making changes.'];
  value.safetyReview = { policyVersion: POLICY_VERSION, humanReviewRequired: humanReview,
    severityBasis: impact.length ? (impact.some(row=>row.requestImpact)?'observed_request_failures':'observed_operational_impact') : benign ? 'bounded_benign_window' : 'impact_unverified',
    reasons: [impact.length ? 'observed_operational_impact' : benign ? 'bounded_benign_window' : 'impact_or_recovery_unverified',
      ...(supported.length !== value.evidence.length || !hasEvidence ? ['evidence_support_rechecked'] : []),
      ...(humanReview ? ['unverified_or_high_risk_action'] : [])],
    evidenceLines: value.evidence.flatMap(excerpt => excerpt.split(/\r?\n/).map(text => rows.find(row => row.text.trim() === text.trim())?.line)).filter(Number.isInteger) };
  // Source-derived text can expand beyond a valid model response (for example,
  // a long variable name plus a corroboration explanation). Recheck the public
  // contract before persistence rather than saving a response the UI must reject.
  const arrays=[value.evidence,value.steps,value.missingInformation,value.verificationSteps];
  const texts=[value.summary,value.rootCause,value.recommendation,value.noiseAssessment,...arrays.flat()];
  if(arrays.some(items=>items.length>20)||texts.some(text=>typeof text!=='string'||!text.trim()||text.length>4000)) {
    throw Object.assign(new Error('Safety output exceeds analysis contract bounds.'),{code:'AI_INVALID_RESPONSE'});
  }
  return value;
}

module.exports = { applySafety, observations, supportedEvidence, safeDiagnostic, POLICY_VERSION };
