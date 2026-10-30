const express = require('express');
const { createRateLimiter } = require('../middleware/rateLimiters');
const { AppError } = require('../operations/errors');
const { saveLead } = require('../services/earlyAccessService');

// Dependency injection supports HTTP tests against both stubs and isolated SQL.
function createEarlyAccessRouter({ database, enabled = () => process.env.EARLY_ACCESS_ENABLED === 'true' }) {
  const router = express.Router();
  router.use((req, res, next) => { res.locals.routeBase = req.baseUrl; next(); });
  router.post('/', createRateLimiter({ windowMs: 60 * 60 * 1000, limit: 5 }),
    express.json({ limit: '4kb', strict: true }), async (req, res, next) => {
      try {
        if (!enabled()) throw new AppError('EARLY_ACCESS_UNAVAILABLE');
        if (!req.is('application/json')) throw new AppError('LEAD_INVALID');
        await saveLead(req.body, database);
        return res.status(200).json({ received: true });
      } catch (error) { next(error); }
    });
  return router;
}
module.exports = { createEarlyAccessRouter };
