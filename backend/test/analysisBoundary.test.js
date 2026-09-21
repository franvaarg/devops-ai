const test = require('node:test');
const assert = require('node:assert/strict');
const { redactSecrets } = require('../src/security/redactSecrets');
const { parseAnalysis } = require('../src/services/analysisContract');
const source = 'ERROR database connection refused';
const valid = { severity: 'High', summary: 'Connection failed', evidence: [source], rootCause: 'Possibly unavailable database', confidence: 'Medium', recommendation: 'Check availability', steps: ['Check service health'] };
test('redacts credentials and preserves diagnostic context', () => {
  for (const secret of ['password=super-secret', '"api_key": "super-secret"', 'Authorization: Bearer super-secret', 'Cookie: sid=super-secret; session=other-secret', 'postgresql://admin:super-secret@db.example/app', 'AWS_SECRET_ACCESS_KEY=super-secret', '-----BEGIN PRIVATE KEY-----\nsuper-secret\n-----END PRIVATE KEY-----', '-----BEGIN RSA PRIVATE KEY-----\nsuper-secret']) {
    const result = redactSecrets(`ERROR connection failed\n${secret}`);
    assert.ok(result.startsWith('ERROR connection failed\n'));
    assert.ok(result.includes('[REDACTED]'));
    assert.ok(!result.includes('super-secret'));
    assert.ok(!result.includes('other-secret'));
    assert.equal(redactSecrets(result), result);
  }
  const trace = 'Error: timeout\n  at connect (/app/db.js:12:4)';
  assert.equal(redactSecrets(trace), trace);
});
test('redacts standalone JWT and cloud credentials', () => {
  for (const secret of ['eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature', 'AKIA1234567890123456', 'ghp_123456789012345678901234567890']) assert.equal(redactSecrets(secret), '[REDACTED]');
});
test('accepts bounded analysis with source-backed evidence', () => {
  assert.deepEqual(parseAnalysis(JSON.stringify(valid), source), valid);
});
test('rejects invalid and fabricated model output without disclosing it', () => {
  for (const value of [null, [], {}, {...valid, extra: true}, {...valid, severity: 'Emergency'}, {...valid, steps: [42]}, {...valid, summary: ''}, {...valid, summary: 'x'.repeat(4001)}, {...valid, evidence: ['invented outage']}, {...valid, steps: Array(21).fill('check')}]) assert.throws(() => parseAnalysis(JSON.stringify(value), source), { code: 'AI_INVALID_RESPONSE' });
  for (const text of ['secret malformed JSON', 'x'.repeat(65537), undefined]) assert.throws(() => parseAnalysis(text, source), (error) => error.code === 'AI_INVALID_RESPONSE' && !error.message.includes('secret'));
});
test('missing evidence forces low confidence and insufficient-evidence diagnosis', () => {
  const result = parseAnalysis(JSON.stringify({...valid, evidence: [], confidence: 'High'}), source);
  assert.equal(result.confidence, 'Low');
  assert.equal(result.rootCause, 'Insufficient evidence to determine a root cause.');
});
