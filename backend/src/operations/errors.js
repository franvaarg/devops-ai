const definitions = Object.freeze({
  ACCOUNT_SUBSCRIPTION_ACTIVE: [409, 'This account has billing records. Contact support to cancel billing and complete account deletion.'],
  AI_CANCELLED: [408, 'Analysis was canceled. This attempt did not use your monthly allowance.'],
  AI_TIMEOUT: [504, 'Analysis timed out. Please retry; this attempt did not use your monthly allowance.'],
  AI_NETWORK: [502, 'The analysis provider could not be reached. Please retry shortly.'],
  AI_PROVIDER_UNAVAILABLE: [503, 'The configured analysis provider is unavailable.'],
  AI_AUTH: [503, 'The analysis provider configuration needs operator attention.'],
  AI_QUOTA_CONFIGURATION: [503, 'The analysis provider allowance is unavailable. Please try again later.'],
  AI_RATE_LIMITED: [503, 'The analysis provider is busy. Please retry shortly.'],
  AI_REQUEST_REJECTED: [502, 'The analysis provider could not accept this request. Try a smaller relevant log excerpt.'],
  LOG_INVALID: [400, 'Use a text log up to 16 KiB. Submit the relevant incident window rather than the entire file.'],
  BILLING_UNAVAILABLE: [503, 'Subscriptions are not available yet. Your Free account remains available.'],
  BILLING_ERROR: [502, 'Billing could not be completed. Please retry; your plan has not been changed.'],
  BILLING_SIGNATURE_INVALID: [400, 'Invalid billing notification.'],
  SUBSCRIPTION_EXISTS: [409, 'A subscription already exists. Manage it through the billing portal.'],
  VALIDATION_ERROR: [400, 'The request is invalid.'],
  AUTHENTICATION_REQUIRED: [401, 'Authentication is required.'],
  FORBIDDEN: [403, 'Access is not permitted.'],
  RESOURCE_NOT_FOUND: [404, 'The resource was not found.'],
  RATE_LIMITED: [429, 'Too many requests. Please try again later.'],
  QUOTA_EXCEEDED: [429, 'Monthly analysis quota exceeded.'],
  IDEMPOTENCY_CONFLICT: [409, 'This request key has already been used with different input.'],
  ANALYSIS_IN_PROGRESS: [409, 'This analysis is still in progress. Retry with the same request key.'],
  ANALYSIS_ATTEMPT_FAILED: [409, 'This analysis attempt failed or expired. Start a new attempt with a new request key.'],
  AI_PROVIDER_ERROR: [502, 'Analysis is unavailable right now. Please try again shortly; unsuccessful analyses do not use your monthly allowance.'],
  AI_INVALID_RESPONSE: [502, 'We could not validate the analysis. Please try again; this attempt did not use your monthly allowance.'],
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
