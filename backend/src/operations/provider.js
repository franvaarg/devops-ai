const { AppError } = require('./errors');
const { log } = require('./logger');
const { classifyProviderFailure } = require('../services/aiReliability');
async function providerCall(provider, operation) {
  const start = performance.now();
  try {
    const value = await operation();
    log('provider_request', { provider, outcome: 'success', durationMs: Math.round(performance.now() - start) });
    return value;
  } catch (error) {
    const code = provider === 'brevo' ? 'EMAIL_PROVIDER_ERROR' : error?.code === 'AI_INVALID_RESPONSE' ? 'AI_INVALID_RESPONSE' : classifyProviderFailure(error).code;
    log('provider_request', { provider, outcome: 'failure', status: Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599 ? error.status : undefined, code, expected: false, durationMs: Math.round(performance.now() - start) });
    const safe = new AppError(code);
    if (provider === 'gemini') safe.retryable = error?.retryable === true;
    throw safe;
  }
}
module.exports = { providerCall };
