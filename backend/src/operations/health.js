const { logFailure } = require('./logger');
// Public probes expose no configuration, versions or provider data.
function installHealth(app, pool) {
  app.locals.draining = false;
  let pending;
  app.get('/health/live', (_req, res) => res.json({ status: 'alive' }));
  app.get('/health/ready', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    if (app.locals.draining) return res.status(503).json({ status: 'unavailable' });
    try {
      // Share overlapping probes rather than exhausting the connection pool.
      pending ||= pool.query(`SELECT id, token_version, plan, subscription_status,
        provider_customer_id, provider_subscription_id, current_period_end,
        cancel_at_period_end, billing_checkout_id, billing_checkout_expires FROM users LIMIT 0;
        SELECT evidence, confidence, decision FROM analyses LIMIT 0;
        SELECT analyses_used FROM monthly_usage LIMIT 0;
        SELECT status, expires_at FROM analysis_requests LIMIT 0;
        SELECT token_hash FROM password_reset_tokens LIMIT 0;
        SELECT id FROM billing_events LIMIT 0;
        SELECT event FROM product_events LIMIT 0`).finally(() => { pending = undefined; });
      await pending;
      return res.status(app.locals.draining ? 503 : 200).json({ status: app.locals.draining ? 'unavailable' : 'ready' });
    } catch (error) {
      logFailure('readiness_failed', error);
      return res.status(503).json({ status: 'unavailable' });
    }
  });
}
module.exports = { installHealth };
