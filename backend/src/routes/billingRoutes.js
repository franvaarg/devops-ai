const express = require('express');
const { rateLimit } = require('express-rate-limit');
const authenticate = require('../middleware/authenticateToken');
const { AppError } = require('../operations/errors');
const billing = require('../services/billingService');
const router = express.Router();
const limiter = rateLimit({ windowMs: 60000, limit: 10, standardHeaders: true, legacyHeaders: false });
router.post('/webhook', async (req, res, next) => {
  let event;
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new AppError('BILLING_UNAVAILABLE');
    event = billing.stripe().webhooks.constructEvent(req.body, req.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
  } catch { return next(new AppError('BILLING_SIGNATURE_INVALID')); }
  try { await billing.processEvent(event); res.json({ received: true }); }
  catch (error) { next(error); }
});
router.get('/plans', rateLimit({ windowMs: 60000, limit: 60, standardHeaders: true, legacyHeaders: false }), async (_req, res, next) => {
  try {
    const pricing = billing.configured() ? await billing.price() : null;
    res.json({ freeLimit: 50, proLimit: 500, maxLogBytes: 16384, pricing, available: !!pricing });
  } catch (error) { next(error instanceof AppError ? error : new AppError('BILLING_ERROR')); }
});
for (const action of ['checkout', 'portal']) {
  router.post('/' + action, express.json({ limit: '1kb' }), authenticate, limiter, async (req, res, next) => {
    try { res.json(await billing[action](req.user.id)); }
    catch (error) { next(error instanceof AppError ? error : new AppError('BILLING_ERROR')); }
  });
}
module.exports = router;
