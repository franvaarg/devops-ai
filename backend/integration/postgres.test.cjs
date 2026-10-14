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

const billing = require('../src/services/billingService');
test('verified billing updates are transactional, replay safe, and use current provider state', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_local_fixture';
  process.env.STRIPE_PRICE_ID = 'price_pro';
  const account = await user();
  await pool.query("UPDATE users SET provider_customer_id=$2 WHERE id=$1", [account.id, 'cus_' + account.id]);
  let status = 'active'; let reads = 0;
  const api = billing.stripe();
  api.subscriptions.retrieve = async id => { reads++; return { id, customer: 'cus_' + account.id, status, items: { data: [{price:{id:'price_pro'},quantity:1,current_period_end: Math.floor(Date.now()/1000)+3600}] }, cancel_at_period_end: true }; };
  const event = { id: 'evt_' + account.id, type: 'customer.subscription.updated', data: { object: { id:'sub_'+account.id, customer:'cus_'+account.id, status:'incomplete' } } };
  await billing.processEvent(event);
  assert.equal((await quota.getAnalysisUsage(account.id)).plan, 'pro');
  await billing.processEvent(event); assert.equal(reads, 1);
  status = 'past_due';
  await billing.processEvent({...event,id:event.id+'_failed'});
  assert.equal((await quota.getAnalysisUsage(account.id)).plan, 'free');
  // An older active payload cannot restore Pro when Stripe currently reports past_due.
  await billing.processEvent({...event,id:event.id+'_old'});
  assert.equal((await quota.getAnalysisUsage(account.id)).plan, 'free');
  status = 'active'; await billing.processEvent({...event,id:event.id+'_paid'});
  assert.equal((await quota.getAnalysisUsage(account.id)).plan, 'pro');
  await pool.query('UPDATE users SET current_period_end=now()-interval \'1 second\' WHERE id=$1', [account.id]);
  assert.equal((await quota.getAnalysisUsage(account.id)).plan, 'free');
  const saved = await execute(account.id);
  assert.ok(saved.id);
});

test('subscription customer mismatch never grants access or acknowledges the event', async () => {
  const account = await user();
  await pool.query('UPDATE users SET provider_customer_id=$2 WHERE id=$1', [account.id,'cus_'+account.id]);
  billing.stripe().subscriptions.retrieve = async () => ({ customer: 'cus_other' });
  const event = {id:'evt_wrong_'+account.id,type:'customer.subscription.created',data:{object:{id:'sub_wrong',customer:'cus_'+account.id}}};
  await assert.rejects(billing.processEvent(event), {code:'BILLING_ERROR'});
  assert.equal((await quota.getAnalysisUsage(account.id)).plan,'free');
  assert.equal((await pool.query('SELECT * FROM billing_events WHERE id=$1',[event.id])).rows.length,0);
});

test('new decision fields persist, belong to their account, and delete with the analysis', async () => {
  const account = await user(); const other = await user();
  const saved = await saveAnalysis({...analysis,actionability:'Investigate',falsePositiveRisk:'High',noiseAssessment:'Legacy behavior may be expected.'},'ERROR database',account.id);
  const history = await getHistory(account.id);
  assert.equal(history[0].decision.actionability,'Investigate');
  assert.equal((await getHistory(other.id)).length,0);
  assert.equal(await deleteAnalysis(saved.id,other.id),null);
  await deleteAnalysis(saved.id,account.id); assert.equal((await getHistory(account.id)).length,0);
});

test('raw signed webhook accepts genuine signature, rejects forgery and does not trust redirects', async () => {
  const app = require('../src/app');
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_fixture';
  const account = await user();
  await pool.query('UPDATE users SET provider_customer_id=$2 WHERE id=$1',[account.id,'cus_'+account.id]);
  billing.stripe().subscriptions.retrieve = async id => ({id,customer:'cus_'+account.id,status:'active',items:{data:[{price:{id:'price_pro'},quantity:1,current_period_end:Math.floor(Date.now()/1000)+3600}]}});
  const payload = JSON.stringify({id:'evt_signed_'+account.id,type:'customer.subscription.created',data:{object:{id:'sub_signed_'+account.id,customer:'cus_'+account.id}}});
  const signature = billing.stripe().webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});
  const forged = await request(app).post('/api/billing/webhook').set('Content-Type','application/json').set('stripe-signature','forged').send(payload);
  assert.equal(forged.status,400); assert.equal((await quota.getAnalysisUsage(account.id)).plan,'free');
  const valid = await request(app).post('/api/billing/webhook').set('Content-Type','application/json').set('stripe-signature',signature).send(payload);
  assert.equal(valid.status,200); assert.equal((await quota.getAnalysisUsage(account.id)).plan,'pro');
  const tampered = await request(app).post('/api/billing/webhook').set('Content-Type','application/json').set('stripe-signature',signature).send(payload.replace('active','inactive')+' ');
  assert.equal(tampered.status,400);
});

test('checkout reuses customer/session, prevents duplicate subscription, and portal remains available when sales disabled', async () => {
  process.env.BILLING_ENABLED = 'true'; process.env.FRONTEND_URL = 'http://localhost:5174';
  const account = await user(); let creates = 0; let sessions = 0;
  const api = billing.stripe();
  api.prices.retrieve = async () => ({active:true,type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed'},billing_scheme:'per_unit',unit_amount:2900,currency:'usd'});
  api.customers.create = async () => { creates++; return {id:'cus_checkout_'+account.id}; };
  api.subscriptions.list = async () => ({data:[],has_more:false});
  api.checkout.sessions.list = async () => ({data:[],has_more:false});
  api.checkout.sessions.create = async () => { sessions++; return {id:'cs_'+account.id,url:'https://checkout.stripe.com/test',expires_at:Math.floor(Date.now()/1000)+1800}; };
  api.checkout.sessions.retrieve = async () => ({status:'open',url:'https://checkout.stripe.com/test'});
  assert.equal((await billing.checkout(account.id)).url,'https://checkout.stripe.com/test');
  await billing.checkout(account.id); assert.equal(creates,1); assert.equal(sessions,1);
  assert.equal((await quota.getAnalysisUsage(account.id)).plan,'free');
  api.subscriptions.list = async () => ({data:[{status:'active'}],has_more:false});
  await assert.rejects(billing.checkout(account.id),{code:'SUBSCRIPTION_EXISTS'});
  process.env.BILLING_ENABLED = 'false';
  api.billingPortal.sessions.create = async args => { assert.equal(args.customer,'cus_checkout_'+account.id); return {url:'https://billing.stripe.com/test'}; };
  assert.equal((await billing.portal(account.id)).url,'https://billing.stripe.com/test');
  await assert.rejects(billing.checkout(account.id),{code:'BILLING_UNAVAILABLE'});
});

test('history cursor returns older incidents without exposing another account', async () => {
  const account = await user(); const other = await user();
  const a = await saveAnalysis(analysis,'ERROR first',account.id);
  const b = await saveAnalysis(analysis,'ERROR second',account.id);
  await saveAnalysis(analysis,'ERROR unrelated',other.id);
  const recent = await getHistory(account.id,{limit:1}); assert.equal(recent[0].id,b.id);
  const older = await getHistory(account.id,{limit:1,beforeId:b.id}); assert.equal(older[0].id,a.id);
  assert.equal((await getHistory(account.id,{beforeId:a.id})).length,0);
});

test('opt-in first and second analysis milestones are atomic and replay does not duplicate them', async () => {
  const app = require('../src/app'); const account = await user();
  const token = require('jsonwebtoken').sign({userId:account.id,email:account.email,tokenVersion:0},process.env.JWT_SECRET);
  const counts = async () => (await pool.query("SELECT event,count(*)::integer AS count FROM product_events WHERE event IN ('first_analysis','second_analysis') GROUP BY event ORDER BY event")).rows;
  const before = await counts();
  const baseline = Object.fromEntries(before.map(row=>[row.event,row.count]));
  const key = randomUUID();
  const send = k => request(app).post('/api/analyze').set('Authorization',`Bearer ${token}`).set('Idempotency-Key',k).send({log:'ERROR database',analytics:true});
  assert.equal((await send(key)).status,201); assert.equal((await send(key)).status,201);
  assert.equal((await send(randomUUID())).status,201);
  assert.equal((await send(randomUUID())).status,201);
  const after = Object.fromEntries((await counts()).map(row=>[row.event,row.count]));
  assert.equal(after.first_analysis-(baseline.first_analysis||0),1);
  assert.equal(after.second_analysis-(baseline.second_analysis||0),1);
});

test('pre-release no-context idempotency keys still replay, while changing context conflicts', async () => {
  const account = await user(); const key = randomUUID();
  const saved = await execute(account.id,key);
  const token = require('jsonwebtoken').sign({userId:account.id,email:account.email,tokenVersion:0},process.env.JWT_SECRET);
  const app = require('../src/app');
  const send = context => request(app).post('/api/analyze').set('Authorization',`Bearer ${token}`).set('Idempotency-Key',key).send({log:'ERROR database',context});
  const replay = await send(''); assert.equal(replay.status,201); assert.equal(replay.body.id,saved.id);
  assert.equal((await quota.getAnalysisUsage(account.id)).used,1);
  const changed = await send('New operational context'); assert.equal(changed.status,409); assert.equal(changed.body.error.code,'IDEMPOTENCY_CONFLICT');
});

test('health readiness verifies migrated PostgreSQL and logout revokes existing bearer tokens', async () => {
  const app = require('../src/app');
  assert.equal((await request(app).get('/health/ready')).status, 200);
  const account = await user();
  const token = require('jsonwebtoken').sign({userId:account.id,tokenVersion:0},process.env.JWT_SECRET);
  assert.equal((await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`)).status, 204);
  assert.equal((await request(app).get('/api/history').set('Authorization', `Bearer ${token}`)).status, 401);
  assert.equal((await pool.query('SELECT token_version FROM users WHERE id=$1', [account.id])).rows[0].token_version, 1);
});

test('authenticated HTTP history and deletion deny access to another account data', async () => {
  const app = require('../src/app');
  const owner = await user(); const attacker = await user();
  const saved = await saveAnalysis(analysis, 'ERROR private synthetic database', owner.id);
  const token = require('jsonwebtoken').sign({userId:attacker.id,tokenVersion:0},process.env.JWT_SECRET);
  const history = await request(app).get('/api/history?search=private').set('Authorization', `Bearer ${token}`);
  assert.equal(history.status, 200); assert.deepEqual(history.body, []);
  const deletion = await request(app).delete('/api/history/' + saved.id).set('Authorization', `Bearer ${token}`);
  assert.equal(deletion.status, 404);
  assert.equal((await getHistory(owner.id))[0].id, saved.id);
});
