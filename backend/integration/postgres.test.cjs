const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { readFileSync, readdirSync, realpathSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomUUID, createHash } = require('node:crypto');
const bcrypt = require('bcryptjs');
const request = require('supertest');
// Refuse a manually supplied remote/shared database, even with NODE_ENV=test.
const socket = process.env.KANYI_EPHEMERAL_TEST_DIR;
assert.equal(process.env.NODE_ENV, 'test');
assert.equal(process.env.DATABASE_URL, '');
assert.equal(process.env.DB_NAME, 'kanyi_integration_test');
assert.equal(process.env.DB_HOST, socket);
assert.ok(socket && realpathSync(socket).startsWith(`${realpathSync(tmpdir())}/kanyi-pg-test-`));
const pool = require('../src/database/db');
const quota = require('../src/services/quotaService');
const { saveAnalysis, getHistory, deleteAnalysis } = require('../src/services/analysisService');
const { resetPassword } = require('../src/services/passwordResetService');
const root = resolve(__dirname, '../..');
const analysis = { severity: 'High', summary: 'Database failed', evidence: ['ERROR database'], rootCause: 'Possibly unavailable', confidence: 'Low', recommendation: 'Check health', steps: ['Check database'] };
let userCount = 0;
async function user(plan = 'free', status = 'inactive') {
  const email = `test-${++userCount}@example.test`;
  const result = await pool.query('INSERT INTO users(name,email,password,plan,subscription_status) VALUES ($1,$2,$3,$4,$5) RETURNING *', ['Test User', email, await bcrypt.hash('reliable-test-password', 4), plan, status]);
  return result.rows[0];
}
async function seedUsage(id, used) {
  await pool.query("INSERT INTO monthly_usage VALUES ($1,date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC')::date,$2)", [id, used]);
}
async function execute(id, key = randomUUID()) {
  const reservation = await quota.reserveAnalysis(id, key, 'ERROR database');
  if (reservation.replay) return reservation.replay;
  return quota.completeAnalysis(id, key, (client) => saveAnalysis(analysis, 'ERROR database', id, client));
}
before(async () => {
  await pool.query(readFileSync(join(root, 'database/init.sql'), 'utf8'));
  for (const file of readdirSync(join(root, 'database/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    await pool.query(readFileSync(join(root, 'database/migrations', file), 'utf8'));
  }
});
after(() => pool.end());

test('migrations are rerunnable and preserve existing users and history', async () => {
  const account = await user();
  const saved = await execute(account.id);
  for (const file of readdirSync(join(root, 'database/migrations')).filter((name) => name.endsWith('.sql')).sort()) await pool.query(readFileSync(join(root, 'database/migrations', file), 'utf8'));
  assert.equal((await getHistory(account.id))[0].id, saved.id);
  assert.equal((await quota.getAnalysisUsage(account.id)).used, 1);
});

test('parallel reservations at the last slot admit exactly one provider operation', async () => {
  const account = await user(); await seedUsage(account.id, 49);
  const results = await Promise.allSettled(Array.from({ length: 16 }, () => execute(account.id)));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.ok(results.filter((r) => r.status === 'rejected').every((r) => r.reason.code === 'QUOTA_EXCEEDED'));
  assert.deepEqual(await quota.getAnalysisUsage(account.id), { limit: 50, plan: 'free', used: 50, reserved: 0, remaining: 0 });
  assert.equal((await getHistory(account.id)).length, 1);
});

test('parallel identical keys reserve once; completed replay never charges again', async () => {
  const account = await user(); const key = randomUUID();
  const results = await Promise.allSettled(Array.from({ length: 10 }, () => quota.reserveAnalysis(account.id, key, 'ERROR database')));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.ok(results.filter((r) => r.status === 'rejected').every((r) => r.reason.code === 'ANALYSIS_IN_PROGRESS'));
  const saved = await quota.completeAnalysis(account.id, key, (client) => saveAnalysis(analysis, 'ERROR database', account.id, client));
  const replay = await quota.reserveAnalysis(account.id, key, 'ERROR database');
  assert.equal(replay.replay.id, saved.id);
  assert.equal((await quota.getAnalysisUsage(account.id)).used, 1);
  await assert.rejects(quota.reserveAnalysis(account.id, key, 'different'), { code: 'IDEMPOTENCY_CONFLICT' });
  await deleteAnalysis(saved.id, account.id);
  await assert.rejects(quota.reserveAnalysis(account.id, key, 'ERROR database'), { code: 'RESOURCE_NOT_FOUND' });
  assert.equal((await quota.getAnalysisUsage(account.id)).used, 1);
});

test('failure rolls back analysis and usage, release restores slot, failed key cannot rerun', async () => {
  const account = await user(); await seedUsage(account.id, 49); const key = randomUUID();
  await quota.reserveAnalysis(account.id, key, 'ERROR database');
  await assert.rejects(quota.completeAnalysis(account.id, key, async (client) => {
    await saveAnalysis(analysis, 'ERROR database', account.id, client);
    throw new Error('simulated persistence failure');
  }));
  assert.equal((await getHistory(account.id)).length, 0);
  assert.equal((await quota.getAnalysisUsage(account.id)).used, 49);
  await quota.releaseAnalysis(account.id, key);
  await quota.releaseAnalysis(account.id, key);
  assert.equal((await quota.getAnalysisUsage(account.id)).remaining, 1);
  await assert.rejects(quota.reserveAnalysis(account.id, key, 'ERROR database'), { code: 'ANALYSIS_ATTEMPT_FAILED' });
  await execute(account.id);
  assert.equal((await quota.getAnalysisUsage(account.id)).used, 50);
});

test('expired process reservations recover capacity and cannot later charge', async () => {
  const account = await user(); await seedUsage(account.id, 49); const key = randomUUID();
  await quota.reserveAnalysis(account.id, key, 'ERROR database');
  await pool.query("UPDATE analysis_requests SET expires_at = clock_timestamp() - interval '1 second' WHERE user_id=$1", [account.id]);
  assert.equal((await quota.getAnalysisUsage(account.id)).remaining, 1);
  await execute(account.id);
  await assert.rejects(quota.completeAnalysis(account.id, key, () => { throw new Error('must not run'); }), { code: 'ANALYSIS_ATTEMPT_FAILED' });
  assert.equal((await quota.getAnalysisUsage(account.id)).used, 50);
});

test('plans use authoritative subscription state and user data remains isolated', async () => {
  const active = await user('pro', 'active'); await seedUsage(active.id, 50);
  await execute(active.id);
  assert.equal((await quota.getAnalysisUsage(active.id)).limit, 500);
  const inactive = await user('pro', 'past_due'); await seedUsage(inactive.id, 50);
  await assert.rejects(execute(inactive.id), { code: 'QUOTA_EXCEEDED' });
  assert.equal((await getHistory(inactive.id)).length, 0);
  const saved = (await getHistory(active.id))[0];
  assert.equal(await deleteAnalysis(saved.id, inactive.id), null);
  assert.equal((await getHistory(active.id)).length, 1);
});

test('constraints reject duplicate users, orphan analyses and negative usage', async () => {
  const account = await user();
  await assert.rejects(pool.query('INSERT INTO users(name,email,password) VALUES ($1,$2,$3)', ['Other', account.email, 'hash']), { code: '23505' });
  await assert.rejects(saveAnalysis(analysis, 'ERROR database', 2147483647), { code: '23503' });
  await assert.rejects(seedUsage(account.id, -1), { code: '23514' });
});

test('password reset persists token revocation and consumes reset token once', async () => {
  const account = await user(); const token = 'f'.repeat(64);
  await pool.query("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES ($1,$2,clock_timestamp()+interval '1 hour')", [account.id, createHash('sha256').update(token).digest('hex')]);
  const outcomes = await Promise.all([resetPassword(token, 'changed-test-password'), resetPassword(token, 'changed-test-password')]);
  assert.equal(outcomes.filter(Boolean).length, 1);
  const saved = (await pool.query('SELECT * FROM users WHERE id=$1', [account.id])).rows[0];
  assert.equal(saved.token_version, 1);
  assert.ok(await bcrypt.compare('changed-test-password', saved.password));
});

test('real registration, login, authenticated analysis, replay and history API', async () => {
  // Provider only is replaced: HTTP, JWT, services, SQL and transactions are real.
  const path = require.resolve('../src/services/aiService');
  let calls = 0;
  require.cache[path] = { id: path, filename: path, loaded: true, exports: { analyzeLog: async () => { calls++; return analysis; } } };
  const app = require('../src/app');
  const response = await request(app).post('/api/auth/register').send({ name: 'API Tester', email: 'api@example.test', password: 'a-robust-integration-passphrase' });
  assert.equal(response.status, 201);
  const token = response.body.token;
  const login = await request(app).post('/api/auth/login').send({ email: 'api@example.test', password: 'a-robust-integration-passphrase' });
  assert.equal(login.status, 200);
  const key = randomUUID();
  const send = () => request(app).post('/api/analyze').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send({ log: 'ERROR database' });
  const first = await send(); const retry = await send();
  assert.equal(first.status, 201); assert.equal(retry.status, 201); assert.equal(first.body.id, retry.body.id); assert.equal(calls, 1);
  const history = await request(app).get('/api/history').set('Authorization', `Bearer ${token}`);
  assert.equal(history.body.length, 1);
  await pool.query('UPDATE users SET token_version=token_version+1 WHERE id=$1', [response.body.user.id]);
  assert.equal((await request(app).get('/api/history').set('Authorization', `Bearer ${token}`)).status, 401);
});

test('late release after committed response loss cannot refund or charge completed work', async () => {
  const account = await user(); const key = randomUUID();
  const saved = await execute(account.id, key);
  await quota.releaseAnalysis(account.id, key);
  assert.equal((await execute(account.id, key)).id, saved.id);
  assert.equal((await quota.getAnalysisUsage(account.id)).used, 1);
});

test('same request key in different accounts does not return another account analysis', async () => {
  const first = await user(); const second = await user(); const key = randomUUID();
  const a = await execute(first.id, key); const b = await execute(second.id, key);
  assert.notEqual(a.id, b.id);
  assert.equal((await getHistory(first.id)).length, 1);
  assert.equal((await getHistory(second.id)).length, 1);
});

test('completion charges reservation period even across a UTC month boundary', async () => {
  const account = await user(); const key = randomUUID();
  await quota.reserveAnalysis(account.id, key, 'ERROR database');
  await pool.query("INSERT INTO monthly_usage VALUES ($1,'2000-01-01',0)", [account.id]);
  await pool.query("UPDATE analysis_requests SET period_start='2000-01-01' WHERE user_id=$1", [account.id]);
  await quota.completeAnalysis(account.id, key, (client) => saveAnalysis(analysis, 'ERROR database', account.id, client));
  const old = await pool.query("SELECT analyses_used FROM monthly_usage WHERE user_id=$1 AND period_start='2000-01-01'", [account.id]);
  assert.equal(old.rows[0].analyses_used, 1);
  assert.equal((await quota.getAnalysisUsage(account.id)).used, 0);
});

test('completion marker constraint failure rolls back both usage increment and analysis', async () => {
  const account = await user(); const key = randomUUID();
  await quota.reserveAnalysis(account.id, key, 'ERROR database');
  await assert.rejects(quota.completeAnalysis(account.id, key, async (client) => {
    await saveAnalysis(analysis, 'ERROR database', account.id, client);
    return { id: 2147483647 };
  }), { code: '23503' });
  assert.equal((await quota.getAnalysisUsage(account.id)).used, 0);
  assert.equal((await getHistory(account.id)).length, 0);
  await quota.releaseAnalysis(account.id, key);
  assert.equal((await quota.getAnalysisUsage(account.id)).reserved, 0);
});
