const { setTimeout: sleep } = require('node:timers/promises');
const { log } = require('../operations/logger');
function classifyProviderFailure(error) {
  if (error?.code === 'AI_CANCELLED') return { code: 'AI_CANCELLED', retryable: false, retryAfterMs: 0 };
  let detail;
  try { detail = JSON.parse(error?.message)?.error; } catch { /* No raw error logging. */ }
  const providerCode = /^[A-Z_]+$/.test(detail?.status || '') ? detail.status : undefined;
  const reason = /overloaded|high demand/i.test(detail?.message || '') ? 'provider_overloaded' : undefined;
  const status = Number.isInteger(error?.status) ? error.status : undefined;
  const details = Array.isArray(detail?.details) ? detail.details : [];
  const retryInfo = details.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
  const delay = /^(\d+(?:\.\d+)?)s$/.exec(retryInfo?.retryDelay || '');
  const retryAfterMs = delay ? Math.ceil(Number(delay[1]) * 1000) : 0;
  const hardQuota = details.some(d => d['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure' &&
    d.violations?.some(v => /perday|permonth/i.test(v.quotaId || '') || Number(v.quotaValue) === 0));
  const timeout = ['AbortError', 'TimeoutError'].includes(error?.name) || error?.code === 'AI_TIMEOUT';
  const network = error?.code === 'AI_NETWORK' || ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET'].includes(error?.cause?.code || error?.code);
  const retryable = !hardQuota && (timeout || network || [500, 502, 503, 504].includes(status) ||
    (status === 429 && (details.length === 0 || !!retryInfo)));
  return { status, providerCode, reason, retryable, retryAfterMs, code: timeout ? 'AI_TIMEOUT' : network ? 'AI_NETWORK' : hardQuota ? 'AI_QUOTA_CONFIGURATION' : [401, 403].includes(status) ? 'AI_AUTH' : status === 429 ? 'AI_RATE_LIMITED' : status >= 400 && status < 500 ? 'AI_REQUEST_REJECTED' : 'AI_PROVIDER_ERROR' };
}
// SDK transport cancellation; application retries, without concurrent or nested retries.
async function reliableGeneration(operation, options = {}) {
  const { now = () => performance.now(), wait = sleep, random = Math.random,
    deadlineMs = 45000, attemptMs = 20000, maxAttempts = 3, signal: callerSignal } = options;
  const cancelled = () => Object.assign(new Error('Analysis cancelled'), { code: 'AI_CANCELLED', retryable: false });
  const started = now();
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (callerSignal?.aborted) throw cancelled();
    const remaining = deadlineMs - (now() - started);
    if (remaining <= 0) throw lastError || Object.assign(new Error("Analysis deadline exceeded"), { code: "AI_TIMEOUT", retryable: true });
    const timeout = Math.max(1, Math.min(attemptMs, remaining));
    const controller = new AbortController();
    let timer;
    let onCancel;
    let failureError;
    try {
      const value = await Promise.race([
        Promise.resolve().then(() => { if (callerSignal?.aborted) throw cancelled(); return operation({ timeout, signal: controller.signal }); }),
        new Promise((_, reject) => {
          onCancel = () => { controller.abort(); reject(cancelled()); };
          callerSignal?.addEventListener('abort', onCancel, { once: true });
          if (callerSignal?.aborted) onCancel();
        }),
        new Promise((_, reject) => { timer = setTimeout(() => {
          controller.abort();
          const error = new Error('Analysis deadline exceeded'); error.code = 'AI_TIMEOUT'; reject(error);
        }, timeout); })
      ]);
      log('provider_attempt', { provider: 'gemini', attempt, outcome: 'success', durationMs: Math.round(now() - started) });
      return value;
    } catch (error) { failureError = error instanceof Error ? error : new Error("Provider failure"); lastError = failureError; }
    finally { clearTimeout(timer); callerSignal?.removeEventListener('abort', onCancel); }
    const failure = classifyProviderFailure(failureError);
    log('provider_attempt', { provider: 'gemini', attempt, outcome: 'failure', status: failure.status, providerCode: failure.providerCode, reason: failure.reason, code: failure.code, retryable: failure.retryable });
    const delay = Math.max(failure.retryAfterMs, 500 * 2 ** (attempt - 1) + Math.floor(random() * 250));
    if (!failure.retryable || attempt === maxAttempts || now() - started + delay >= deadlineMs) {
      failureError.retryable = failure.retryable; failureError.code = failure.code; throw failureError;
    }
    log('provider_retry', { provider: 'gemini', attempt, delayMs: delay });
    try { await wait(delay, undefined, { signal: callerSignal }); }
    catch (error) { if (callerSignal?.aborted) throw cancelled(); throw error; }
  }
}
module.exports = { reliableGeneration, classifyProviderFailure };
