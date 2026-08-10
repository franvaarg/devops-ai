const express = require("express");

const pool = require("../database/db");
const authenticateToken = require("../middleware/authenticateToken");
const { getAnalysisUsage } = require("../services/quotaService");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
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
        currentPeriodEnd: account.current_period_end,
        email: account.email,
        id: account.id,
        name: account.name,
        plan: account.plan,
        subscriptionStatus: account.subscription_status,
      },
      usage,
    });
  } catch (error) {
    console.error("Account error:", error);

    return res.status(500).json({
      message: "Something went wrong while loading the account.",
    });
  }
});

module.exports = router;
