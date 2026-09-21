const assert = require('node:assert/strict');
const { test } = require('node:test');
const sdkPath = require.resolve('@google/genai');
const servicePath = require.resolve('../src/services/aiService');
function harness(t, generateContent) {
  const original = require.cache[sdkPath];
  const apiKey = process.env.GEMINI_API_KEY;
  const env = process.env.NODE_ENV;
  process.env.GEMINI_API_KEY = 'test-placeholder'; process.env.NODE_ENV = 'test';
  require.cache[sdkPath] = { id: sdkPath, filename: sdkPath, loaded: true, exports: {
    GoogleGenAI: class { models = { generateContent }; }
  } };
  delete require.cache[servicePath];
  t.after(() => {
    if (original) require.cache[sdkPath] = original; else delete require.cache[sdkPath];
    delete require.cache[servicePath];
    if (apiKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = apiKey;
    if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
  });
  return require(servicePath);
}
test('Gemini request has bounded time/output/attempts and redacted input', async (t) => {
  let calls = 0;
  const { analyzeLog } = harness(t, async (request) => {
    calls++;
    assert.equal(request.config.httpOptions.timeout, 30000);
    assert.equal(request.config.httpOptions.retryOptions.attempts, 1);
    assert.equal(request.config.maxOutputTokens, 4096);
    assert.ok(!request.contents.includes('secret-password'));
    return { text: JSON.stringify({ severity: 'Low', summary: 'Error observed', evidence: ['ERROR'], rootCause: 'Possibly configuration', confidence: 'Low', recommendation: 'Check configuration', steps: [] }) };
  });
  const result = await analyzeLog('ERROR password=secret-password');
  assert.equal(result.severity, 'Low'); assert.equal(calls, 1);
});
test('Gemini failure and invalid JSON map to safe application errors without retries', async (t) => {
  let calls = 0;
  const { analyzeLog } = harness(t, async () => { calls++; throw new Error('secret-provider-response'); });
  await assert.rejects(analyzeLog('ERROR'), { code: 'AI_PROVIDER_ERROR', message: 'The AI provider could not complete the analysis.' });
  assert.equal(calls, 1);
});
test('Gemini malformed response is rejected at the real service boundary', async (t) => {
  const { analyzeLog } = harness(t, async () => ({ text: '{secret-malformed' }));
  await assert.rejects(analyzeLog('ERROR'), { code: 'AI_INVALID_RESPONSE' });
});
