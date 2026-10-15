const bcrypt = require('bcryptjs');
const pool = require('../database/db');
const { AppError } = require('../operations/errors');
const { log } = require('../operations/logger');
async function deleteAccount(userId, password) {
  if (typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) throw new AppError('VALIDATION_ERROR');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    const result = await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [userId]);
    const user = result.rows[0];
    if (!user || !await bcrypt.compare(password, user.password)) throw new AppError('AUTHENTICATION_REQUIRED');
    // Billing cancellation and statutory payment retention need a separate owner flow.
    // Never silently delete an account that Stripe could still charge.
    if (user.provider_customer_id) throw new AppError('ACCOUNT_SUBSCRIPTION_ACTIVE');
    await client.query('DELETE FROM users WHERE id=$1', [userId]);
    await client.query('COMMIT');
    log('account_deleted');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
    throw error;
  } finally { client.release(); }
}
module.exports = { deleteAccount };
