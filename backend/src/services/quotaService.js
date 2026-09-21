const { createHash } = require('node:crypto');
const pool = require('../database/db');
const { AppError } = require('../operations/errors');
const { log, logFailure } = require('../operations/logger');
const PLAN_LIMITS = Object.freeze({ free: 50, pro: 500 });
function planFor(account) {
  return account?.plan === 'pro' && ['active', 'trialing'].includes(account.subscription_status) ? 'pro' : 'free';
}
// All reservation and completion transactions lock the same user row first.
// No database lock or connection is held while waiting for Gemini.
async function transaction(userId, operation) {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    const result = await client.query('SELECT plan, subscription_status FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!result.rows[0]) throw new AppError('AUTHENTICATION_REQUIRED');
    const value = await operation(client, planFor(result.rows[0]));
    await client.query('COMMIT');
    return value;
  } catch (error) {
    try { await client?.query('ROLLBACK'); } catch { /* connection may have failed */ }
    logFailure('quota_transaction_failed', error);
    throw error;
  } finally { client?.release(); }
}
async function reserveAnalysis(userId, requestKey, input) {
  const hash = createHash('sha256').update(input).digest('hex');
  const result = await transaction(userId, async (client, plan) => {
    const existing = await client.query('SELECT *, expires_at > clock_timestamp() AS active FROM analysis_requests WHERE user_id = $1 AND request_key = $2', [userId, requestKey]);
    const prior = existing.rows[0];
    if (prior) {
      if (prior.input_hash !== hash) throw new AppError('IDEMPOTENCY_CONFLICT');
      if (prior.status === 'completed') {
        const result = await client.query('SELECT * FROM analyses WHERE id = $1 AND user_id = $2', [prior.analysis_id, userId]);
        if (!result.rows[0]) throw new AppError('RESOURCE_NOT_FOUND');
        return { replay: result.rows[0] };
      }
      throw new AppError(prior.status === 'pending' && prior.active ? 'ANALYSIS_IN_PROGRESS' : 'ANALYSIS_ATTEMPT_FAILED');
    }
    const period = (await client.query("SELECT date_trunc('month', clock_timestamp() AT TIME ZONE 'UTC')::date::text AS period")).rows[0].period;
    await client.query('INSERT INTO monthly_usage(user_id, period_start, analyses_used) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING', [userId, period]);
    const usage = await client.query(`SELECT analyses_used,
      (SELECT count(*) FROM analysis_requests WHERE user_id = $1 AND period_start = $2 AND status = 'pending' AND expires_at > clock_timestamp())::integer AS reserved
      FROM monthly_usage WHERE user_id = $1 AND period_start = $2`, [userId, period]);
    if (usage.rows[0].analyses_used + usage.rows[0].reserved >= PLAN_LIMITS[plan]) throw new AppError('QUOTA_EXCEEDED');
    await client.query(`INSERT INTO analysis_requests(user_id, request_key, input_hash, period_start, status, expires_at)
      VALUES ($1, $2, $3, $4, 'pending', clock_timestamp() + interval '2 minutes')`, [userId, requestKey, hash, period]);
    return { reserved: true };
  });
  log(result.replay ? "quota_replayed" : "quota_reserved");
  return result;
}
async function completeAnalysis(userId, requestKey, operation) {
  const result = await transaction(userId, async (client) => {
    const result = await client.query('SELECT *, expires_at > clock_timestamp() AS active FROM analysis_requests WHERE user_id = $1 AND request_key = $2', [userId, requestKey]);
    const reservation = result.rows[0];
    if (!reservation || reservation.status !== 'pending' || !reservation.active) throw new AppError('ANALYSIS_ATTEMPT_FAILED');
    const analysis = await operation(client);
    await client.query('UPDATE monthly_usage SET analyses_used = analyses_used + 1 WHERE user_id = $1 AND period_start = $2', [userId, reservation.period_start]);
    await client.query("UPDATE analysis_requests SET status = 'completed', analysis_id = $3 WHERE user_id = $1 AND request_key = $2", [userId, requestKey, analysis.id]);
    return analysis;
  });
  log("quota_consumed");
  return result;
}
async function releaseAnalysis(userId, requestKey) {
  await transaction(userId, async (client) => {
    await client.query("UPDATE analysis_requests SET status = 'failed' WHERE user_id = $1 AND request_key = $2 AND status = 'pending'", [userId, requestKey]);
  });
  log('quota_released');
}
async function getAnalysisUsage(userId) {
  const result = await pool.query(`SELECT u.plan, u.subscription_status, COALESCE(m.analyses_used, 0) AS used,
    (SELECT count(*)::integer FROM analysis_requests r WHERE r.user_id = u.id AND r.period_start = date_trunc('month', clock_timestamp() AT TIME ZONE 'UTC')::date
      AND r.status = 'pending' AND r.expires_at > clock_timestamp()) AS reserved
    FROM users u LEFT JOIN monthly_usage m ON m.user_id = u.id AND m.period_start = date_trunc('month', clock_timestamp() AT TIME ZONE 'UTC')::date WHERE u.id = $1`, [userId]);
  if (!result.rows[0]) throw new AppError('AUTHENTICATION_REQUIRED');
  const { used, reserved } = result.rows[0];
  const plan = planFor(result.rows[0]);
  const limit = PLAN_LIMITS[plan];
  return { limit, plan, used, reserved, remaining: Math.max(limit - used - reserved, 0) };
}
module.exports = { reserveAnalysis, completeAnalysis, releaseAnalysis, getAnalysisUsage };
