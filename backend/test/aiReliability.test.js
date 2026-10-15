const { test } = require('node:test');
const assert = require('node:assert/strict');
const { reliableGeneration, classifyProviderFailure } = require('../src/services/aiReliability');
const { context } = require('../src/operations/logger');
function http(status, details) { return Object.assign(new Error(JSON.stringify({ error: { details } })), { status }); }
function clock() { let time = 0; const waits = []; return { waits, now: () => time, wait: async ms => { waits.push(ms); time += ms; }, random: () => 0 }; }
for (const status of [429, 500, 502, 503, 504]) test(`HTTP ${status} backs off and recovers`, async () => {
  const options = clock(); let count = 0;
  assert.equal(await reliableGeneration(async () => { if (++count < 3) throw http(status); return 'recovered'; }, options), 'recovered');
  assert.equal(count, 3); assert.deepEqual(options.waits, [500, 1000]);
});
for (const status of [400, 401, 403, 404, 422]) test(`HTTP ${status} is never retried`, async () => {
  let count = 0; await assert.rejects(reliableGeneration(async () => { count++; throw http(status); }, clock()), { status }); assert.equal(count, 1);
});
test('daily and zero quota do not retry even with RetryInfo', () => {
  const error = http(429, [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'RequestsPerDay', quotaValue: '100' }] }, { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '1s' }]);
  assert.equal(classifyProviderFailure(error).retryable, false);
  assert.equal(classifyProviderFailure(http(429, [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaValue: '0' }] }])).retryable, false);
});
test('provider retry delay cannot exceed overall budget', async () => {
  const options = clock(); let count = 0;
  const error = http(429, [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '60s' }]);
  await assert.rejects(reliableGeneration(async () => { count++; throw error; }, options)); assert.equal(count, 1); assert.deepEqual(options.waits, []);
});
test('timeout aborts transport and can recover', async () => {
  let count = 0, firstSignal;
  const result = await reliableGeneration(async ({ signal }) => {
    if (++count === 1) { firstSignal = signal; return new Promise(() => {}); } return 'recovered';
  }, { attemptMs: 5, deadlineMs: 1000, wait: async () => {}, random: () => 0, now: () => 0 });
  assert.equal(result, 'recovered'); assert.equal(firstSignal.aborted, true); assert.equal(count, 2);
});
test('exhausted transient failures stop after three attempts with same request ID', async () => {
  let count = 0;
  await context.run({ requestId: 'retry-correlation' }, async () => {
    await assert.rejects(reliableGeneration(async () => { count++; assert.equal(context.getStore().requestId, 'retry-correlation'); throw http(503); }, clock()), { status: 503, retryable: true });
  }); assert.equal(count, 3);
});
test('network reset recovers; unknown and malformed errors do not retry', async () => {
  let count = 0;
  assert.equal(await reliableGeneration(async () => { if (++count === 1) throw Object.assign(new Error(), { cause: { code: 'ECONNRESET' } }); return true; }, clock()), true);
  for (const error of [new Error('secret'), Object.assign(new Error(), { code: 'AI_INVALID_RESPONSE' })]) {
    let calls = 0; await assert.rejects(reliableGeneration(async () => { calls++; throw error; }, clock())); assert.equal(calls, 1);
  }
});
test('remaining attempt timeout shrinks to fit overall deadline', async () => {
  let elapsed = 0; const timeouts = [];
  await assert.rejects(reliableGeneration(async ({ timeout }) => {
    timeouts.push(timeout); elapsed += timeout; throw Object.assign(new Error(), { name: 'AbortError' });
  }, { now: () => elapsed, wait: async ms => { elapsed += ms; }, random: () => 0 }));
  assert.deepEqual(timeouts, [20000, 20000, 3500]); assert.equal(elapsed, 45000);
});
test('RetryInfo waits at least the provider interval before successful recovery', async () => {
  const options = clock(); let calls = 0;
  await reliableGeneration(async () => { if (++calls === 1) throw http(429, [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '2s' }]); return true; }, options);
  assert.deepEqual(options.waits, [2000]);
});
test('a delayed backoff never starts another attempt past the deadline', async () => {
  let elapsed = 0, calls = 0;
  await assert.rejects(reliableGeneration(async () => { calls++; throw http(503); }, { now: () => elapsed, wait: async () => { elapsed = 60000; }, random: () => 0 }));
  assert.equal(calls, 1);
});

test('provider classification distinguishes auth, input rejection, transient throttling and network failures', () => {
  assert.equal(classifyProviderFailure({status:401}).code, 'AI_AUTH');
  assert.equal(classifyProviderFailure({status:403}).retryable, false);
  assert.equal(classifyProviderFailure({status:400}).code, 'AI_REQUEST_REJECTED');
  assert.equal(classifyProviderFailure({status:429}).code, 'AI_RATE_LIMITED');
  assert.equal(classifyProviderFailure({code:'ECONNRESET'}).code, 'AI_NETWORK');
});

test('caller cancellation aborts in-flight transport and never retries', async () => {
 const controller=new AbortController();let calls=0;let transport;
 const pending=reliableGeneration(async ({signal})=>{calls++;transport=signal;queueMicrotask(()=>controller.abort());return new Promise(()=>{});},{signal:controller.signal});
 await assert.rejects(pending,{code:'AI_CANCELLED',retryable:false});
 assert.equal(calls,1);assert.equal(transport.aborted,true);
});
test('already canceled work does not contact provider', async () => {
 const controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(reliableGeneration(async()=>{calls++;},{signal:controller.signal}),{code:'AI_CANCELLED'});
 assert.equal(calls,0);
});
