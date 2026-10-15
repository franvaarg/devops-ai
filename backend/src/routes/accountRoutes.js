const express = require("express");

const pool = require("../database/db");
const authenticateToken = require("../middleware/authenticateToken");
const { getAnalysisUsage } = require("../services/quotaService");

const router = express.Router();
router.use((req, res, next) => { res.locals.routeBase = req.baseUrl; next(); });

router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const accountResult = await pool.query(
      `
        SELECT
          id,
          name,
          email,
          plan,
          subscription_status,
          current_period_end,
          cancel_at_period_end,
          provider_customer_id,
          created_at
        FROM users
        WHERE id = $1;
      `,
      [req.user.id]
    );
    const account = accountResult.rows[0];
    const usage = await getAnalysisUsage(req.user.id);

    return res.status(200).json({
      account: {
        createdAt: account.created_at,
        hasBillingCustomer: !!account.provider_customer_id,
        cancelAtPeriodEnd: account.cancel_at_period_end,
        currentPeriodEnd: account.current_period_end,
        email: account.email,
        id: account.id,
        name: account.name,
        plan: usage.plan,
        subscriptionStatus: account.subscription_status,
      },
      usage,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/', authenticateToken, require('../middleware/rateLimiters').loginRateLimiter, async (req, res, next) => {
  try {
    await require('../services/accountService').deleteAccount(req.user.id, req.body?.password);
    res.status(204).end();
  } catch (error) { next(error); }
});

module.exports = router;
