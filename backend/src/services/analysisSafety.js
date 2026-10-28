// This policy recognizes a bounded set of observations, not arbitrary causal truth.
// Unknown formats fail conservatively to investigation; counters/words alone do not
// prove an outage. Context and quoted external payloads are never impact evidence.
const POLICY_VERSION = '2026-10-28.1';
const MIN_MAJOR_FAILURES = 20;
const MAJOR_FAILURE_RATIO = 0.5;
const readOnlyStep = 'Inspect service health, error rates and adjacent timestamped logs using read-only tools.';
const reviewMessage = 'Human review required: do not execute proposed changes. Obtain owner approval and verify backups and rollback procedures before any mutation; destructive changes can cause data loss.';

function observations(source) {
  return source.split(/\r?\n/).map((text, index) => {
    const body = text.trim().replace(/^\d{4}-\d\d-\d\dT\S+\s+|^\d\d:\d\d(?::\d\d)?\s+/, '');
    const timestamp = /^(\d{4}-\d\d-\d\dT\S+)|^(\d\d):(\d\d)(?::(\d\d))?\s/.exec(text.trim());
    const clockType = timestamp?.[1] ? 'absolute' : 'time_only';
    let clock = NaN;
    if (timestamp?.[1]) {
      if (/(?:Z|[+-]\d\d:\d\d)$/.test(timestamp[1])) clock = Date.parse(timestamp[1]);
    } else if (timestamp && Number(timestamp[2]) < 24 && Number(timestamp[3]) < 60 && Number(timestamp[4] || 0) < 60) {
      clock = Number(timestamp[2]) * 3600 + Number(timestamp[3]) * 60 + Number(timestamp[4] || 0);
    }
    const external = /["'`<>]|\b(?:message|payload|example|fixture|simulation|test|ignore.*instructions)\b/i.test(body);
    const operational = /^(?:INFO|WARN|ERROR|FATAL|METRIC)\b|^(?:GET|POST|PUT|DELETE|PATCH)\s+\//.test(body);
    const eligible = operational && !external;
    const number = key => {
      const match = new RegExp(`\\b(?:${key})=(\\d+)(?![\\w.])`).exec(body);
      return match ? Number(match[1]) : undefined;
    };
    const total = number('requests_total|requests|completed_requests');
    const failed = number('failed_requests|failures');
    const validCounts = Number.isSafeInteger(total) && Number.isSafeInteger(failed) && total > 0 && failed <= total;
    const impact = eligible && validCounts && failed > 0;
    const major = impact && failed >= MIN_MAJOR_FAILURES && failed / total >= MAJOR_FAILURE_RATIO;
    const critical = major && failed === total && /\bproduction\b/i.test(body) && !/\b(?:staging|historical|previous|no production)\b/i.test(body);
    const requestError = eligible && /^(?:(?:ERROR|WARN)\s+)?(?:GET|POST|PUT|DELETE|PATCH)\s+\/\S+\s+(?:status=)?5\d\d\b/.test(body);
    const dbFailure = eligible && /\b(?:database|postgres(?:ql)?)\b.*\b(?:connection refused|connection failed|unavailable|authentication failed)\b/i.test(body);
    const authFailure = eligible && /\b(?:login|authentication|access)\b.*\b(?:failed|failure|rejected|denied)\b/i.test(body);
    const adverse = eligible && (/^(?:ERROR|FATAL)\s+\S/.test(body) || requestError || dbFailure || authFailure || /\b(?:timeout|deprecated|warning|ImagePullBackOff|unavailable|failed|failure|refused|denied|rejected|crash|fatal|critical|breach)\b/i.test(body));
    const onlyCounters = /^METRIC(?: [a-z][a-z0-9_-]*)? (?:(?:requests_total|requests|completed_requests|failed_requests|failures)=\d+)(?: (?:requests_total|requests|completed_requests|failed_requests|failures)=\d+)*$/i.test(body);
    const benign = eligible && !adverse && (/^INFO healthcheck (?:status=200|healthy)$/.test(body) || (onlyCounters && validCounts && failed === 0));
    return { text, body, clock, clockType, line: index + 1, eligible, impact, major, critical, requestError, dbFailure, authFailure, adverse, benign };
  }).filter(row => row.text.trim());
}

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
  const canonical = [readOnlyStep,
    'Inspect database health and application connection errors using read-only tools.',
    'Inspect the configuration and diagnostic event named in the evidence using read-only tools.'];
  return canonical.includes(text) || /^(?:check|verify|inspect|review|confirm|monitor|collect) (?:the )?(?:service metrics|service health|health|availability|configuration|adjacent logs|logs|database health|error rates|latency metrics|deployment configuration)(?: using read-only tools)?\.?$/i.test(text.trim());
}

function causalObservation(rows) {
  const rules = [
    [/\brequired environment variable ([A-Z][A-Z0-9_]*) missing\b/, match => `The supplied log reports required environment variable ${match[1]} missing. This supports a configuration failure in this window.`],
    [/\bMissing required environment variable ([A-Z][A-Z0-9_]*)\b/, match => `The supplied log reports required environment variable ${match[1]} missing. This supports a configuration failure in this window.`],
    [/\b(?:heap out of memory|out of memory|Reached heap limit Allocation failed)\b/i, () => 'The supplied log reports memory exhaustion. The cause of the memory growth is unknown.'],
    [/\bpassword authentication failed\b/i, () => 'The supplied log reports rejected database authentication. The credential or configuration responsible is unknown.'],
    [/\bgetaddrinfo ENOTFOUND\b/, () => 'The supplied log reports DNS resolution failure. The underlying DNS or hostname configuration cause is unknown.'],
  ];
  for (const row of rows) {
    if (!row.eligible || !/^(?:ERROR|FATAL)\b/i.test(row.body)) continue;
    for (const [pattern, explain] of rules) {
      const match = pattern.exec(row.text);
      if (match) return { row, explanation: explain(match) };
    }
  }
  return null;
}

function applySafety(value, source) {
  const rows = observations(source);
  const impact = rows.filter(row => row.impact);
  const issues = rows.filter(row => row.adverse || row.dbFailure || row.authFailure || row.requestError);
  const recovered = recoveredWindow(rows);
  const benign = (rows.length > 0 && rows.every(row => row.benign)) || recovered;
  const supported = supportedEvidence(value.evidence, source);
  const cause = causalObservation(rows);
  const hasEvidence = supported.length > 0;
  // Prioritize adverse observations over the model's choice of a healthy line.
  const support = [...impact.filter(row => row.critical), ...(cause ? [cause.row] : []), ...impact, ...issues];
  value.evidence = [...new Set([...support.map(row => row.text), ...supported])].slice(0, 20);
  // Contract limits must also apply to evidence added by policy.
  if (value.evidence.some(line => line.length > 4000)) {
    throw Object.assign(new Error('Safety evidence exceeds contract bounds.'), { code: 'AI_INVALID_RESPONSE' });
  }

  const critical = impact.some(row => row.critical);
  const minorWarnings = issues.length > 0 && issues.every(row => /^WARN legacy [\w .-]+ deprecated; compatibility mode enabled$/.test(row.body));
  const severity = critical ? 'Critical' : impact.some(row => row.major) ? 'High' : impact.length ? 'Medium' : benign || minorWarnings ? 'Low' : 'Medium';
  value.severity = severity;
  value.actionability = impact.length ? 'Action Required' : benign && hasEvidence ? 'Likely Noise' : !value.evidence.length ? 'Insufficient Evidence' : 'Investigate';
  value.falsePositiveRisk = impact.length ? 'Low' : benign ? 'High' : 'Medium';
  value.summary = impact.length
    ? 'Failed-request counts in the supplied window establish service impact. Recovery and current health require independent verification.'
    : benign && hasEvidence ? recovered ? 'The supplied ordered window shows cache refresh retry success followed by served requests with zero failures. Present health is unverified.' : 'The supplied window contains only successful health or request observations.'
      : 'The supplied excerpt does not establish the extent of impact. Investigation is required; current health and recovery are unverified.';
  value.noiseAssessment = impact.length
    ? 'Adverse request counts prevent a benign dismissal. Other successful events do not establish recovery for the affected service.'
    : benign && hasEvidence ? recovered ? 'Matching cache refresh retry success and subsequent zero-failure request counts support benign recovery in this supplied window only.' : 'Only successful observations are present in this excerpt; this does not establish health beyond the supplied window.'
      : 'Legacy labels, repetition, old timestamps and unrelated healthy events do not establish harmlessness or recovery.';

  // Cause confidence refers to cause, not certainty that a failure was observed.
  // Only independently recognized direct diagnostics receive Medium; no qualitative
  // model confidence is accepted as proof. High is deliberately not emitted yet.
  value.rootCause = cause ? cause.explanation : rows.some(row => row.dbFailure)
    ? 'Possible database connection failure is reported. The underlying cause is unverified.'
    : 'Insufficient evidence to determine a root cause.';
  value.confidence = cause && value.confidence !== 'Low' ? 'Medium' : 'Low';

  const proposed = [value.recommendation, ...value.steps, ...(value.verificationSteps || [])];
  const humanReview = proposed.some(step => !safeDiagnostic(step));
  // Even a read-only-sounding model action can embed unsupported recovery or
  // causal claims. Render verified diagnostic guidance instead of free prose.
  const diagnostic = rows.some(row => row.dbFailure)
    ? 'Inspect database health and application connection errors using read-only tools.'
    : cause ? 'Inspect the configuration and diagnostic event named in the evidence using read-only tools.' : readOnlyStep;
  value.recommendation = humanReview ? reviewMessage : diagnostic;
  value.steps = humanReview ? [diagnostic, reviewMessage] : [diagnostic];
  value.verificationSteps = [diagnostic];
  // Free prose in trust fields is also unverified, so do not retain model assertions.
  value.missingInformation = ['Current service impact, affected scope and independently verified recovery.', 'Evidence identifying the underlying cause before making changes.'];
  value.safetyReview = { policyVersion: POLICY_VERSION, humanReviewRequired: humanReview,
    severityBasis: impact.length ? 'observed_request_failures' : benign ? 'bounded_benign_window' : 'impact_unverified',
    reasons: [impact.length ? 'observed_request_failures' : benign ? 'bounded_benign_window' : 'impact_or_recovery_unverified',
      ...(supported.length !== value.evidence.length || !hasEvidence ? ['evidence_support_rechecked'] : []),
      ...(humanReview ? ['unverified_or_high_risk_action'] : [])],
    evidenceLines: value.evidence.flatMap(excerpt => excerpt.split(/\r?\n/).map(text => rows.find(row => row.text.trim() === text.trim())?.line)).filter(Number.isInteger) };
  return value;
}

module.exports = { applySafety, observations, supportedEvidence, safeDiagnostic, POLICY_VERSION };
