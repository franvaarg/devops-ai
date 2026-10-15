const assert = require('node:assert/strict');
const { test } = require('node:test');
const sdkPath = require.resolve('@google/genai');
const servicePath = require.resolve('../src/services/aiService');
const adapterPath = require.resolve('../src/services/geminiProvider');
function harness(t, generateContent) {
  const original = require.cache[sdkPath];
  const apiKey = process.env.GEMINI_API_KEY;
  const env = process.env.NODE_ENV;
  process.env.GEMINI_API_KEY = 'test-placeholder'; process.env.NODE_ENV = 'test';
  require.cache[sdkPath] = { id: sdkPath, filename: sdkPath, loaded: true, exports: {
    GoogleGenAI: class { models = { generateContent }; }
  } };
  delete require.cache[servicePath];
  delete require.cache[adapterPath];
  t.after(() => {
    if (original) require.cache[sdkPath] = original; else delete require.cache[sdkPath];
    delete require.cache[servicePath];
  delete require.cache[adapterPath];
    if (apiKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = apiKey;
    if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
  });
  return require(servicePath);
}
test('Gemini request has bounded time/output/attempts and redacted input', async (t) => {
  let calls = 0;
  const { analyzeLog } = harness(t, async (request) => {
    calls++;
    assert.equal(request.config.httpOptions.timeout, 20000);
    assert.equal(request.config.httpOptions.retryOptions, undefined);
    assert.ok(request.config.abortSignal instanceof AbortSignal);
    assert.equal(request.config.maxOutputTokens, 2048);
    assert.ok(!request.contents.includes('secret-password'));
    return { text: JSON.stringify({ actionability: 'Investigate', falsePositiveRisk: 'High', noiseAssessment: 'Insufficient context to distinguish incident from noise.', severity: 'Low', summary: 'Error observed', evidence: ['ERROR'], rootCause: 'Possibly configuration', confidence: 'Low', recommendation: 'Check configuration', steps: [], missingInformation: ['Impact unknown'], verificationSteps: ['Check health'] }) };
  });
  const result = await analyzeLog('ERROR password=secret-password');
  assert.equal(result.severity, 'Low'); assert.equal(calls, 1);
});
test('Gemini failure and invalid JSON map to safe application errors without retries', async (t) => {
  let calls = 0;
  const { analyzeLog } = harness(t, async () => { calls++; throw new Error('secret-provider-response'); });
  await assert.rejects(analyzeLog('ERROR'), { code: 'AI_PROVIDER_ERROR', message: 'Analysis is unavailable right now. Please try again shortly; unsuccessful analyses do not use your monthly allowance.' });
  assert.equal(calls, 1);
});
test('Gemini malformed response is rejected at the real service boundary', async (t) => {
  let calls = 0;
  const { analyzeLog } = harness(t, async () => { calls++; return { text: '{secret-malformed' }; });
  await assert.rejects(analyzeLog('ERROR'), { code: 'AI_INVALID_RESPONSE' });
  assert.equal(calls, 1);
});
test('missing Gemini configuration does not crash service loading or expose configuration', async (t) => {
  const { analyzeLog: unused } = harness(t, async () => { throw new Error('must not call'); });
  void unused;
  delete process.env.GEMINI_API_KEY;
  delete require.cache[servicePath];
  delete require.cache[adapterPath];
  const service = require(servicePath);
  await assert.rejects(service.analyzeLog('ERROR'), error => error.code === 'AI_AUTH' && error.retryable === false && !error.message.includes('GEMINI_API_KEY'));
});

test('explicit provider registry supports a secondary adapter without silently falling back', async () => {
  const { createAnalyzer } = require('../src/services/aiService');
  let calls=0;
  const secondary={ analyzeLog:async log=>{calls++;return {summary:log};} };
  assert.equal((await createAnalyzer({secondary},'secondary')('synthetic')).summary,'synthetic');
  assert.equal(calls,1);
  assert.throws(()=>createAnalyzer({secondary},'missing'),{code:'AI_PROVIDER_UNAVAILABLE'});
});
