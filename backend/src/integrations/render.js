const { createHash } = require('node:crypto');
const { AppError } = require('../operations/errors');
// Explicit caller-supplied log context. No URL fetching, provider impersonation,
// or inference of the destination account from an event's metadata.
function normalizeRenderEvent(req, _res, next) {
  const event = req.body;
  if (!event || event.type !== 'deploy_failed' || typeof event.eventId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(event.eventId) || typeof event.serviceName !== 'string' ||
      !event.serviceName.trim() || event.serviceName.length > 100 || typeof event.logs !== 'string') {
    return next(new AppError('VALIDATION_ERROR'));
  }
  req.headers['idempotency-key'] = 'render_' + createHash('sha256').update(event.eventId).digest('hex');
  req.body = { log: event.logs, context: `Caller-reported Render deployment failure for service ${event.serviceName}. Event ${event.eventId}. Production impact and recovery are unknown.`, analytics: false };
  next();
}
module.exports = { normalizeRenderEvent };
