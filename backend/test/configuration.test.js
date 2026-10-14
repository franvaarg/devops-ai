const test = require('node:test');
const assert = require('node:assert/strict');
const { validateStartup } = require('../src/operations/configuration');
const env = { NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(32), FRONTEND_URL: 'https://kanyi.example', CORS_ORIGINS: 'https://kanyi.example', GEMINI_API_KEY: 'placeholder', BREVO_API_KEY: 'placeholder', EMAIL_FROM: 'KANYI <support@kanyi.example>' };
test('production rejects missing recovery, provider and malformed origins without exposing their values', () => {
  assert.doesNotThrow(() => validateStartup(env));
  for (const changes of [{ FRONTEND_URL: 'https://secret:password@kanyi.example' }, { CORS_ORIGINS: '*' }, { FRONTEND_URL: 'https://kanyi.example/path' }, { BREVO_API_KEY: '' }, { GEMINI_API_KEY: '' }, { TRUST_PROXY_HOPS: '-1' }, { TRUST_PROXY_HOPS: 'NaN' }, { BILLING_ENABLED: 'true' }]) {
    assert.throws(() => validateStartup({ ...env, ...changes }), error => !error.message.includes('password@') && !error.message.includes('placeholder'));
  }
});
test('local development can keep external services and billing unconfigured', () => {
  assert.doesNotThrow(() => validateStartup({ NODE_ENV: 'development', JWT_SECRET: 'x'.repeat(32) }));
});
