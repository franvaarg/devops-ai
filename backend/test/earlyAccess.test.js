const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createEarlyAccessRouter } = require('../src/routes/earlyAccessRoutes');
const { operations, errorHandler } = require('../src/middleware/operations');
const { validateLead } = require('../src/services/earlyAccessService');
const valid = { email: 'Engineer@Example.test', role: 'Software engineering', useCase: 'Application errors', company: '', teamSize: '', website: '' };
function harness({ fail = false, enabled = true } = {}) {
  const writes = [];
  const app = express(); app.use(operations);
  app.use('/api/early-access', createEarlyAccessRouter({ enabled: () => enabled, database: { query: async (sql, values) => {
    if (fail) throw Object.assign(new Error('private database credentials'), { code: '08006' });
    writes.push({ sql, values }); return { rows: [], rowCount: 1 };
  } } }));
  app.use(errorHandler);
  return { app, writes };
}
test('lead HTTP submission acknowledges only after persistence, normalizes email and exposes no personal data', async () => {
  const { app, writes } = harness();
  const result = await request(app).post('/api/early-access').send(valid);
  assert.equal(result.status, 200); assert.deepEqual(result.body, { received: true });
  assert.equal(writes.length, 1); assert.equal(writes[0].values[0], 'engineer@example.test');
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal((await request(app).get('/api/early-access')).status, 404);
});
test('invalid fields, unknown keys, oversized input and honeypot are rejected before SQL', async () => {
  for (const change of [{ email: 'bad' }, { role: '' }, { useCase: 'made up' }, { company: 'a'.repeat(161) }, { teamSize: 'invalid' }, { website: 'bot.example' }, { email: [] }, { extra: 'field' }, { company: 'a\nb' }, { email: '.a@example.test' }, { email: 'a..b@example.test' }]) {
    const { app, writes } = harness();
    assert.equal((await request(app).post('/api/early-access').send({ ...valid, ...change })).status, 400);
    assert.equal(writes.length, 0);
  }
  for (const body of [null, [], 'input']) assert.throws(() => validateLead(body), { code: 'LEAD_INVALID' });
  const { app, writes } = harness();
  assert.equal((await request(app).post('/api/early-access').send({ ...valid, company: 'x'.repeat(5000) })).status, 413);
  assert.equal((await request(app).post('/api/early-access').set('Content-Type', 'application/json').send('{')).status, 400);
  assert.equal((await request(app).post('/api/early-access').type('form').send(valid)).status, 400);
  assert.equal(writes.length, 0);
});
test('duplicate retries have identical acknowledgement and use atomic conflict handling', async () => {
  const { app, writes } = harness();
  const first = await request(app).post('/api/early-access').send(valid);
  const second = await request(app).post('/api/early-access').send(valid);
  assert.deepEqual(second.body, first.body); assert.equal(second.status, first.status);
  assert.match(writes[0].sql, /ON CONFLICT \(email\) DO NOTHING/);
});
test('rate limits bound valid and invalid requests with Retry-After and no sixth database write', async () => {
  const { app, writes } = harness();
  for (let i = 0; i < 5; i++) await request(app).post('/api/early-access').send(i % 2 ? {} : valid);
  const result = await request(app).post('/api/early-access').send(valid);
  assert.equal(result.status, 429); assert.ok(Number(result.headers['retry-after']) > 0);
  assert.equal(writes.length, 3);
});
test('database failure and disabled intake never acknowledge success or leak details', async () => {
  for (const config of [{ fail: true }, { enabled: false }]) {
    const { app, writes } = harness(config);
    const result = await request(app).post('/api/early-access').send(valid);
    assert.equal(result.status, 503); assert.equal(result.body.received, undefined);
    assert.doesNotMatch(JSON.stringify(result.body), /private|credentials|Engineer/);
    assert.equal(writes.length, 0);
  }
});
test('HTTP response waits for the persistence promise', async () => {
  let persist; let started;
  const writing = new Promise(resolve => { started = resolve; });
  const app = express();
  app.use('/api/early-access', createEarlyAccessRouter({ enabled: () => true, database: { query: () => { started(); return new Promise(resolve => { persist = resolve; }); } } }));
  let finished = false;
  const response = request(app).post('/api/early-access').send(valid).then(result => { finished = true; return result; });
  await writing; assert.equal(finished, false); persist({ rows: [] });
  assert.equal((await response).status, 200);
});
