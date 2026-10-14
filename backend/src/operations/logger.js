const { AsyncLocalStorage } = require('node:async_hooks');
const { classifyError } = require('./errors');
const context = new AsyncLocalStorage();
// Fixed-field allowlist: never serialize arbitrary errors, headers, input or URLs.
function log(event, fields = {}) {
  const record = { timestamp: new Date().toISOString(), event, requestId: context.getStore()?.requestId };
  for (const key of ['method', 'route', 'status', 'durationMs', 'code', 'expected', 'provider', 'outcome', 'databaseCode', 'retryable', 'inputTokens', 'outputTokens', 'thinkingTokens', 'attempt', 'delayMs', 'providerCode', 'reason']) {
    if (fields[key] !== undefined) record[key] = fields[key];
  }
  record.level = fields.expected === false ? 'error' : fields.code ? 'warn' : 'info';
  process.stdout.write(`${JSON.stringify(record)}\n`);
}
function logFailure(event, error) {
  const safe = classifyError(error);
  log(event, { code: safe.code, expected: safe.expected, retryable: safe.retryable,
    databaseCode: /^[0-9A-Z]{5}$/.test(error?.code || "") ? error.code : undefined });
  return safe;
}
module.exports = { context, log, logFailure };
