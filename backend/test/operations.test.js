const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const request = require('supertest');
const { operations, errorHandler } = require('../src/middleware/operations');
const { log, context } = require('../src/operations/logger');
const { AppError, definitions, classifyError } = require('../src/operations/errors');
const { providerCall } = require('../src/operations/provider');
function capture(t) {
  const records = [];
  const write = process.stdout.write;
  process.stdout.write = (line, ...args) => {
    if (typeof line === 'string' && line.startsWith('{"timestamp":')) { records.push(JSON.parse(line)); return true; }
    return write.call(process.stdout, line, ...args);
  };
  t.after(() => { process.stdout.write = write; });
  return records;
}
test('HTTP correlation and safe logging omit inputs, query strings and exception details', async (t) => {
  const records = capture(t);
  const app = express(); app.use(operations); app.use(express.json());
  app.post('/example/:id', () => { throw Object.assign(new Error('secret database password'), { detail: 'secret log' }); });
  app.use(errorHandler);
  const response = await request(app).post('/example/secret-path?token=secret-query')
    .set('Authorization', 'Bearer secret-jwt').set('X-Request-ID', 'secret-caller-id').send({ password: 'secret-password' });
  assert.equal(response.status, 500);
  assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  assert.equal(response.body.error.requestId, response.headers['x-request-id']);
  const http = records.find((r) => r.event === 'http_request');
  assert.equal(http.route, '/example/:id'); assert.equal(http.method, 'POST'); assert.equal(http.status, 500);
  assert.ok(http.durationMs >= 0); assert.equal(http.requestId, response.headers['x-request-id']);
  assert.ok(records.every((r) => r.requestId === http.requestId));
  assert.ok(!JSON.stringify([records, response.body]).includes('secret'));
});
test('structured logger drops unrecognized fields and carries async request context', async (t) => {
  const records = capture(t);
  await context.run({ requestId: 'local-correlation' }, async () => {
    await Promise.resolve();
    log('test_event', { password: 'secret', error: new Error('secret'), authorization: 'secret', durationMs: 10 });
  });
  assert.equal(records[0].requestId, 'local-correlation'); assert.equal(records[0].durationMs, 10);
  assert.ok(!JSON.stringify(records).includes('secret'));
});
test('all error classes have safe public messages and expectedness', () => {
  for (const code of Object.keys(definitions)) {
    const error = new AppError(code);
    assert.equal(classifyError(error), error); assert.equal(error.expected, error.status < 500);
  }
  assert.equal(classifyError({ code: '23503', detail: 'secret' }).code, 'DATABASE_ERROR');
  assert.equal(classifyError(new Error('secret')).message, 'The request could not be completed.');
  assert.equal(new AppError('__proto__').code, 'INTERNAL_ERROR');
});
test('provider wrapper records latency/outcomes and never retries or leaks errors', async (t) => {
  const records = capture(t); let count = 0;
  assert.equal(await providerCall('gemini', async () => 42), 42);
  await assert.rejects(providerCall('gemini', async () => { count++; throw new Error('secret API key'); }), { code: 'AI_PROVIDER_ERROR' });
  await assert.rejects(providerCall('gemini', async () => { throw { code: 'AI_INVALID_RESPONSE', body: 'secret logs' }; }), { code: 'AI_INVALID_RESPONSE' });
  await assert.rejects(providerCall('brevo', async () => { throw new Error('secret reset token'); }), { code: 'EMAIL_PROVIDER_ERROR' });
  assert.equal(count, 1); assert.equal(records.length, 4);
  assert.ok(records.every((r) => r.durationMs >= 0)); assert.ok(!JSON.stringify(records).includes('secret'));
});

test('expected application errors expose their code and correlation without 500 classification', async (t) => {
  const records = capture(t);
  const app = express(); app.use(operations);
  app.get('/quota', () => { throw new AppError('QUOTA_EXCEEDED'); }); app.use(errorHandler);
  const response = await request(app).get('/quota');
  assert.equal(response.status, 429); assert.equal(response.body.error.code, 'QUOTA_EXCEEDED');
  assert.equal(response.body.error.requestId, response.headers['x-request-id']);
  assert.ok(records.every((r) => r.expected === true));
});
