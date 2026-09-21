const { randomUUID } = require('node:crypto');
const { context, log, logFailure } = require('../operations/logger');
const { AppError } = require('../operations/errors');
const statusCodes = { 400: 'VALIDATION_ERROR', 401: 'AUTHENTICATION_REQUIRED', 403: 'FORBIDDEN', 404: 'RESOURCE_NOT_FOUND', 409: 'VALIDATION_ERROR', 413: 'VALIDATION_ERROR', 429: 'RATE_LIMITED', 500: 'INTERNAL_ERROR', 502: 'AI_PROVIDER_ERROR', 503: 'DATABASE_ERROR' };
function operations(req, res, next) {
  // Generate IDs locally; do not trust a caller's arbitrary correlation string.
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  const start = performance.now();
  context.run({ requestId: req.requestId }, () => {
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 400) {
        const code = res.locals.errorCode || statusCodes[res.statusCode] || 'INTERNAL_ERROR';
        body = { ...body, error: { code, message: body?.message || body?.summary || 'The request could not be completed.', requestId: req.requestId } };
      }
      return json(body);
    };
    let recorded = false;
    const record = () => {
      if (recorded) return;
      recorded = true;
      // Route templates only: no query strings, user-provided path segments or tokens.
      const route = req.route ? `${req.baseUrl || ''}${req.route.path}` : 'unmatched';
      context.run({ requestId: req.requestId }, () => log('http_request', {
        method: req.method, route, status: res.statusCode,
        durationMs: Math.round(performance.now() - start),
        outcome: res.writableFinished ? 'completed' : 'disconnected',
        code: res.statusCode >= 400 ? res.locals.errorCode || statusCodes[res.statusCode] || 'INTERNAL_ERROR' : undefined,
        expected: res.statusCode < 500,
      }));
    };
    res.once('finish', record);
    res.once('close', record);
    next();
  });
}
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let safe;
  if (error.type === 'entity.too.large') {
    safe = new AppError('VALIDATION_ERROR'); safe.status = 413; safe.message = 'Request body is too large.';
  } else if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    safe = new AppError('VALIDATION_ERROR'); safe.message = 'Request body must contain valid JSON.';
  } else if (error.message === 'Origin is not allowed by CORS.') {
    safe = new AppError('FORBIDDEN'); safe.message = 'Request origin is not allowed.';
  } else safe = error;
  const classified = logFailure('request_failed', safe);
  res.locals.errorCode = classified.code;
  return res.status(classified.status).json({ message: classified.message });
}
module.exports = { operations, errorHandler };
