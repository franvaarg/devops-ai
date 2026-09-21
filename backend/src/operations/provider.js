const { AppError } = require('./errors');
const { log } = require('./logger');
async function providerCall(provider, operation) {
  const start = performance.now();
  try {
    const value = await operation();
    log('provider_request', { provider, outcome: 'success', durationMs: Math.round(performance.now() - start) });
    return value;
  } catch (error) {
    const code = provider === 'brevo' ? 'EMAIL_PROVIDER_ERROR' : error?.code === 'AI_INVALID_RESPONSE' ? 'AI_INVALID_RESPONSE' : 'AI_PROVIDER_ERROR';
    log('provider_request', { provider, outcome: 'failure', code, expected: false, durationMs: Math.round(performance.now() - start) });
    throw new AppError(code);
  }
}
module.exports = { providerCall };
