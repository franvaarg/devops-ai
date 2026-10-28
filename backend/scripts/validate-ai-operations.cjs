// Offline fault injection. No SDK, application DB or .env is imported.
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { writeFileSync } = require('node:fs');
const { reliableGeneration, classifyProviderFailure } = require('../src/services/aiReliability');
const { context } = require('../src/operations/logger');
function http(status,details=[]) {return Object.assign(new Error(JSON.stringify({error:{status:'RESOURCE_EXHAUSTED',details}})),{status});}
function clock() {let time=0;const waits=[];return {waits,now:()=>time,wait:async ms=>{waits.push(ms);time+=ms;},random:()=>0};}
const scenarios=[
  ['503-recovery-and-request-id',async()=>{
    const timer=clock();let attempts=0;
    await context.run({requestId:'offline-operation-503'},()=>reliableGeneration(async()=>{
      assert.equal(context.getStore().requestId,'offline-operation-503');if(++attempts<3)throw http(503);return true;
    },timer));
    assert.deepEqual(timer.waits,[500,1000]);assert.equal(attempts,3);
    return {attempts,virtualLatencyMs:timer.now(),waits:timer.waits};
  }],
  ['429-retry-info',async()=>{
    const timer=clock();let attempts=0;
    await reliableGeneration(async()=>{if(++attempts===1)throw http(429,[{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'2s'}]);return true;},timer);
    assert.deepEqual(timer.waits,[2000]);return {attempts,virtualLatencyMs:timer.now(),waits:timer.waits};
  }],
  ['daily-quota-metric-no-retry',async()=>{
    const timer=clock();let attempts=0;
    const error=http(429,[{'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaMetric:'generativelanguage.googleapis.com/generate_content_free_tier_requests_per_day',quotaValue:'20'}]},{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'1s'}]);
    await assert.rejects(reliableGeneration(async()=>{attempts++;throw error;},timer));
    const observed={attempts,virtualLatencyMs:timer.now(),retryable:error.retryable};
    assert.equal(attempts,1,JSON.stringify(observed));assert.equal(error.retryable,false);return observed;
  }],
  ['provider-outage-is-bounded',async()=>{
    const timer=clock();let attempts=0;
    await assert.rejects(reliableGeneration(async()=>{attempts++;throw http(503);},timer),{code:'AI_PROVIDER_ERROR'});
    assert.equal(attempts,3);return {attempts,virtualLatencyMs:timer.now()};
  }],
  ['retry-info-beyond-deadline',async()=>{
    const timer=clock();let attempts=0;
    await assert.rejects(reliableGeneration(async()=>{attempts++;throw http(429,[{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'3600s'}]);},timer));
    assert.equal(attempts,1);assert.deepEqual(timer.waits,[]);return {attempts,virtualLatencyMs:timer.now()};
  }],
  ['noncooperative-timeout-no-overlap',async()=>{
    let attempts=0,active=0,maxActive=0;const releases=[];
    try {
      await assert.rejects(reliableGeneration(({signal})=>{
        attempts++;active++;maxActive=Math.max(maxActive,active);
        return new Promise(resolve=>releases.push(()=>{active--;assert.equal(signal.aborted,true);resolve(true);}));
      },{attemptMs:5,deadlineMs:10000,maxAttempts:3,wait:async()=>{},random:()=>0}),{code:'AI_TIMEOUT'});
      const observed={attempts,maxActive};
      assert.equal(attempts,1,JSON.stringify(observed));assert.equal(maxActive,1);return observed;
    } finally {for(const release of releases)release();}
  }],
  ['cooperative-timeout-recovery',async()=>{
    let attempts=0,active=0,maxActive=0;
    const result=await reliableGeneration(({signal})=>{
      attempts++;active++;maxActive=Math.max(maxActive,active);
      if(attempts===1)return new Promise((_,reject)=>signal.addEventListener('abort',()=>{active--;reject(Object.assign(new Error('aborted'),{name:'AbortError'}));},{once:true}));
      active--;return true;
    },{attemptMs:5,deadlineMs:10000,maxAttempts:3,wait:async()=>{},random:()=>0});
    assert.equal(result,true);assert.equal(attempts,2);assert.equal(maxActive,1);return {attempts,maxActive};
  }],
  ['cancellation-never-retries',async()=>{
    const controller=new AbortController();let attempts=0;
    await assert.rejects(reliableGeneration(({signal})=>{
      attempts++;queueMicrotask(()=>controller.abort());return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error(),{name:'AbortError'})),{once:true}));
    },{signal:controller.signal}),{code:'AI_CANCELLED'});
    assert.equal(attempts,1);return {attempts};
  }],
  ['deadline-budget-shrinks',async()=>{
    let time=0;const timeouts=[];
    await assert.rejects(reliableGeneration(async({timeout})=>{timeouts.push(timeout);time+=timeout;throw Object.assign(new Error(),{name:'TimeoutError'});},
      {now:()=>time,wait:async ms=>{time+=ms;},random:()=>0}));
    assert.deepEqual(timeouts,[20000,20000,3500]);assert.equal(time,45000);return {timeouts,virtualLatencyMs:time};
  }],
  ['malformed-provider-details-safe',async()=>{
    for(const details of [[null],['unexpected'],[{'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:'bad'}]]) {
      assert.doesNotThrow(()=>classifyProviderFailure(http(429,details)));
    }
    for(const malformed of [{status:{toString:null},message:{toString:null}},
      {details:[{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:{toString:null}},{'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaMetric:{toString:null}}]}]}]) {
      assert.doesNotThrow(()=>classifyProviderFailure(Object.assign(new Error(JSON.stringify({error:malformed})),{status:429})));
    }
    return {malformedResponses:5};
  }],
  ['parallel-request-contexts-isolated',async()=>{
    const results=await Promise.all(Array.from({length:16},(_,index)=>context.run({requestId:`parallel-${index}`},async()=>{
      let calls=0;const timer=clock();
      await reliableGeneration(async()=>{assert.equal(context.getStore().requestId,`parallel-${index}`);if(++calls===1)throw http(503);return true;},timer);
      return calls;
    })));
    assert.ok(results.every(count=>count===2));return {concurrentRequests:16,totalAttempts:results.reduce((a,b)=>a+b,0)};
  }],
];
async function evaluate() {
  const results=[];
  for(const [name,run] of scenarios){const start=performance.now();try{results.push({name,passed:true,observed:await run(),wallDurationMs:Number((performance.now()-start).toFixed(3))});}
    catch(error){results.push({name,passed:false,error:error.message,wallDurationMs:Number((performance.now()-start).toFixed(3))});}}
  return {timestamp:new Date().toISOString(),status:'VERIFIED OFFLINE',providerCalls:0,
    scope:'Scripted transport faults; virtual wait/deadline latency is not provider service latency. PostgreSQL/concurrent quota tests run separately.',
    passed:results.filter(r=>r.passed).length,total:results.length,results};
}
if(require.main===module){const output=process.argv[process.argv.indexOf('--output')+1];if(!process.argv.includes('--output')||!output)throw new Error('Specify --output PATH');evaluate().then(report=>{writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,total:report.total}));if(report.passed!==report.total)process.exitCode=1;});}
module.exports={evaluate};
