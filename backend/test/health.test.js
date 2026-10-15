const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { EventEmitter } = require('node:events');
const { installHealth } = require('../src/operations/health');
const { installShutdown } = require('../src/operations/shutdown');

test('liveness is independent of DB; readiness conceals authentication and schema failures', async () => {
  const app = express();
  let calls = 0;
  installHealth(app, { query: async () => { calls++; throw Object.assign(new Error('password=secret host=private'), { code: '28P01' }); } });
  assert.equal((await request(app).get('/health/live')).status, 200);
  assert.equal(calls, 0);
  const result = await request(app).get('/health/ready');
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, { status: 'unavailable' });
  assert.equal(result.headers['cache-control'], 'no-store');
});
test('readiness checks schema and remains unavailable throughout shutdown', async () => {
  const app = express(); let calls = 0;
  installHealth(app, { query: async sql => { calls++; assert.match(sql, /billing_events/); assert.match(sql, /decision/); return {}; } });
  assert.equal((await request(app).get('/health/ready')).status, 200);
  app.locals.draining = true;
  assert.equal((await request(app).get('/health/ready')).status, 503);
  assert.equal(calls, 1);
});
test('shutdown stops admission before draining and closes database once', async () => {
  const app = { locals: {} }; const signals = new EventEmitter();
  let close; let ended = 0; let code;
  const stop = installShutdown({ close: callback => { assert.equal(app.locals.draining, true); close = callback; }, closeIdleConnections() {} }, app,
    { end: async () => { ended++; } }, { signals, exit: value => { code = value; }, graceMs: 100 });
  signals.emit('SIGTERM'); stop();
  assert.equal(ended, 0);
  await close(); assert.equal(ended, 1); assert.equal(code, 0);
});
test('hung requests have a bounded shutdown deadline', async () => {
  let code; let forced = false;
  installShutdown({ close() {}, closeAllConnections: () => { forced = true; } }, { locals: {} }, { end() {} },
    { signals: new EventEmitter(), exit: value => { code = value; }, graceMs: 5 })();
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(code, 1); assert.equal(forced, true);
});

test('fatal shutdown drains before reporting a failing exit code', async () => {
 const { installShutdown }=require('../src/operations/shutdown');
 const app={locals:{}};const signals=new (require('node:events').EventEmitter)();let exitCode;
 const server={close:callback=>{setImmediate(callback);},closeIdleConnections:()=>{}};
 const stop=installShutdown(server,app,{end:async()=>{}},{signals,exit:code=>{exitCode=code;},graceMs:100});
 stop(1);assert.equal(app.locals.draining,true);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(exitCode,1);
});
