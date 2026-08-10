const pool = require("../database/db");

const PLAN_LIMITS = Object.freeze({
  free: 50,
  pro: 500,
});

function getPlanLimit(plan) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

async function getUserPlan(userId, database = pool) {
  const result = await database.query(
    "SELECT plan, subscription_status FROM users WHERE id = $1;",
    [userId]
  );

  const account = result.rows[0];

  if (
    account?.plan === "pro" &&
    ["active", "trialing"].includes(account.subscription_status)
  ) {
    return "pro";
  }

  return "free";
}

async function runWithAnalysisQuota(userId, operation) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const plan = await getUserPlan(userId, client);
    const limit = getPlanLimit(plan);
    const result = await client.query(
      `
        INSERT INTO monthly_usage (
          user_id,
          period_start,
          analyses_used
        )
        VALUES ($1, DATE_TRUNC('month', CURRENT_TIMESTAMP)::date, 1)
        ON CONFLICT (user_id, period_start)
        DO UPDATE SET analyses_used = monthly_usage.analyses_used + 1
        WHERE monthly_usage.analyses_used < $2
        RETURNING analyses_used;
      `,
      [userId, limit]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return { allowed: false, limit, plan, used: limit };
    }

    const value = await operation(client);

    await client.query("COMMIT");

    return {
      allowed: true,
      limit,
      plan,
      used: result.rows[0].analyses_used,
      value,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getAnalysisUsage(userId) {
  const plan = await getUserPlan(userId);
  const limit = getPlanLimit(plan);
  const result = await pool.query(
    `
      SELECT analyses_used
      FROM monthly_usage
      WHERE user_id = $1
        AND period_start = DATE_TRUNC('month', CURRENT_TIMESTAMP)::date;
    `,
    [userId]
  );

  const used = result.rows[0]?.analyses_used ?? 0;

  return {
    limit,
    plan,
    remaining: Math.max(limit - used, 0),
    used,
  };
}

module.exports = {
  getAnalysisUsage,
  runWithAnalysisQuota,
};
