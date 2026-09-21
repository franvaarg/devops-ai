const definitions = Object.freeze({
  VALIDATION_ERROR: [400, 'The request is invalid.'],
  AUTHENTICATION_REQUIRED: [401, 'Authentication is required.'],
  FORBIDDEN: [403, 'Access is not permitted.'],
  RESOURCE_NOT_FOUND: [404, 'The resource was not found.'],
  RATE_LIMITED: [429, 'Too many requests. Please try again later.'],
  QUOTA_EXCEEDED: [429, 'Monthly analysis quota exceeded.'],
  IDEMPOTENCY_CONFLICT: [409, 'This request key has already been used with different input.'],
  ANALYSIS_IN_PROGRESS: [409, 'This analysis is still in progress. Retry with the same request key.'],
  ANALYSIS_ATTEMPT_FAILED: [409, 'This analysis attempt failed or expired. Start a new attempt with a new request key.'],
  AI_PROVIDER_ERROR: [502, 'The AI provider could not complete the analysis.'],
  AI_INVALID_RESPONSE: [502, 'The AI provider returned an invalid analysis.'],
  DATABASE_ERROR: [503, 'Data storage is temporarily unavailable.'],
  EMAIL_PROVIDER_ERROR: [502, 'Email delivery could not be completed.'],
  INTERNAL_ERROR: [500, 'The request could not be completed.'],
});
class AppError extends Error {
  constructor(code) {
    const known = Object.hasOwn(definitions, code);
    const [status, message] = known ? definitions[code] : definitions.INTERNAL_ERROR;
    super(message);
    this.code = known ? code : 'INTERNAL_ERROR';
    this.status = status;
    this.expected = status < 500;
    this.retryable = ["DATABASE_ERROR", "AI_PROVIDER_ERROR", "EMAIL_PROVIDER_ERROR", "RATE_LIMITED", "ANALYSIS_IN_PROGRESS"].includes(this.code);
  }
}
function classifyError(error) {
  if (error instanceof AppError) return error;
  if (error?.code === 'AI_INVALID_RESPONSE') return new AppError('AI_INVALID_RESPONSE');
  if (/^[0-9A-Z]{5}$/.test(error?.code || '') ||
      ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE'].includes(error?.code)) return new AppError('DATABASE_ERROR');
  return new AppError('INTERNAL_ERROR');
}
module.exports = { AppError, classifyError, definitions };
