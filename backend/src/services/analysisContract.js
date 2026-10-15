const { redactSecrets } = require('../security/redactSecrets');
const decisionFields = ['actionability', 'falsePositiveRisk', 'noiseAssessment'];
const optionalFields = ['missingInformation', 'verificationSteps'];
const fields = ['severity', 'summary', 'evidence', 'rootCause', 'confidence', 'recommendation', 'steps'];

function invalid() {
  const error = new Error('AI response did not satisfy the analysis contract.');
  error.code = 'AI_INVALID_RESPONSE';
  return error;
}

function validateAnalysis(value, source) {
  const extended = value && decisionFields.some((key) => Object.hasOwn(value, key));
  const expected = [...fields, ...(extended ? decisionFields : []), ...optionalFields.filter(key => value && Object.hasOwn(value, key))];
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== expected.length ||
      !expected.every((key) => Object.hasOwn(value, key))) throw invalid();
  if (!['Low', 'Medium', 'High', 'Critical'].includes(value.severity) ||
      !['Low', 'Medium', 'High'].includes(value.confidence)) throw invalid();
  const validText = (text) => typeof text === 'string' && text.trim().length > 0 && text.length <= 4000;
  if (extended && (!['Action Required', 'Investigate', 'Likely Noise', 'Insufficient Evidence'].includes(value.actionability) || !['Low', 'Medium', 'High'].includes(value.falsePositiveRisk) || !validText(value.noiseAssessment))) throw invalid();
  for (const key of ['summary', 'rootCause', 'recommendation']) {
    if (!validText(value[key])) throw invalid();
  }
  for (const key of ['evidence', 'steps', ...optionalFields.filter(key => Object.hasOwn(value, key))]) {
    if (!Array.isArray(value[key]) || value[key].length > 20 || !value[key].every(validText)) throw invalid();
  }
  // Only literal excerpts can be labeled observed evidence. Matching an excerpt
  // establishes provenance, not that the model's causal inference is correct.
  if (!value.evidence.every((excerpt) => source.includes(excerpt))) throw invalid();
  const safe = Object.fromEntries(expected.map((key) => [key,
    Array.isArray(value[key]) ? value[key].map(redactSecrets) : redactSecrets(value[key])
  ]));
  if (safe.evidence.length === 0) {
    safe.confidence = 'Low';
    safe.severity = 'Low';
    if (extended) { safe.actionability = 'Insufficient Evidence'; safe.falsePositiveRisk = 'High'; }
    safe.rootCause = 'Insufficient evidence to determine a root cause.';
  }
  return safe;
}

function parseAnalysis(text, source, requireDecision = false) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > 65536) throw invalid();
  let value;
  try { value = JSON.parse(text); } catch { throw invalid(); }
  if (requireDecision && !decisionFields.every(key => value && Object.hasOwn(value, key))) throw invalid();
  return validateAnalysis(value, source);
}
module.exports = { parseAnalysis, validateAnalysis };
