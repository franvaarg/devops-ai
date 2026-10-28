const test=require('node:test');
const assert=require('node:assert/strict');
const cases=require('../scripts/reliability-cases.cjs');
const {candidate,evaluate}=require('../scripts/validate-ai-reliability.cjs');
const {evaluate:operations}=require('../scripts/validate-ai-operations.cjs');
const {parseAnalysis}=require('../src/services/analysisContract');
function analyze(source,mode='neutral'){return parseAnalysis(JSON.stringify(candidate(source,mode)),source,true);}
test('benchmark contains distinct justified synthetic cases and independent coverage',()=>{
  assert.ok(cases.length>=30);assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);
  for(const entry of cases){assert.ok(entry.synthetic);assert.ok(entry.rationale.length>60);assert.ok(entry.expected.cause);assert.ok(entry.expected.remediation);assert.ok(Buffer.byteLength(entry.log)<=16384);}
  for(const category of ['docker','kubernetes','postgresql','pool','api','authentication','authorization','memory','disk','cicd','network','legacy','benign','incomplete','contradictory'])assert.ok(cases.some(c=>c.category===category),category);
});
const results=evaluate();
for(const entry of cases)test(`offline policy benchmark: ${entry.id}`,()=>{
  for(const row of results.results.filter(r=>r.id===entry.id)){
    assert.ok(row.result,`${row.mode}: ${row.errorCode}`);
    for(const [key,value] of Object.entries(row.checks))assert.equal(value,true,`${row.mode}: ${key}`);
  }
});
test('confidence scoring penalizes blanket Low and distinguishes diagnosis from support',()=>{
  assert.ok(results.summary.confidenceBins.High.count>0);
  assert.ok(results.summary.confidenceBins.Medium.count>0);
  assert.ok(results.summary.confidenceBins.Low.count>0);
  assert.equal(results.summary.overconfidence,0);assert.equal(results.summary.underconfidence,0);
  assert.equal(results.summary.criticalAsHarmless.length,0);
});
test('operational fault contracts pass with no live providers',async()=>{
  const report=await operations();assert.equal(report.providerCalls,0);
  assert.deepEqual(report.results.filter(r=>!r.passed),[]);
});

test('metamorphic representations and unknown service names preserve measured impact',()=>{
  for(let i=1;i<=24;i++) {
    const service=`mesh-${i}`,total=21+i*13;
    const formats=[`METRIC service="${service}" environment=production failed_requests=${total} requests=${total}`,
      JSON.stringify({Level:'error',service,failed_requests:total,event:'request_metrics',environment:'production',requests:total}),
      `2026-10-28T12:00:00Z METRIC requests=${total} service=${service} environment=production failed_requests=${total}`];
    for(const source of formats)assert.equal(analyze(source).severity,'Critical',source);
    for(const source of formats.map(s=>s.replaceAll('production','staging')))assert.equal(analyze(source).severity,'High');
  }
});
test('metamorphic causal corroboration is independent of proposal and variable names',()=>{
  for(let i=0;i<12;i++) {
    const variable=`QUEUE_HOST_${i}`,service=`consumer-${i}`;
    const failure=`ERROR service=${service} container exited code=1: required environment variable ${variable} missing`;
    for(const mode of ['neutral','dismissive','cautious']) {
      const corroborated=`${failure}\nINFO service=${service} event=config_audit ${variable}_present=false`;
      assert.equal(analyze(corroborated,mode).confidence,'High');
      assert.equal(analyze(`${failure}\nINFO service=other event=config_audit ${variable}_present=false`,mode).confidence,'Medium');
      assert.equal(analyze(`${failure}\nINFO service=${service} event=config_audit ${variable}_present=true`,mode).confidence,'Low');
    }
  }
});
test('duplicate aliases and payload strings can never authorize noise or invented impact',()=>{
  for(const source of [
    'METRIC requests=100 failed_requests=0 failures=100',
    'METRIC requests=100 requests_total=200 failed_requests=0',
    '{"level":"info","event":"request_metrics","requests":100,"failed_requests":100,"failed_requests":0}',
    'INFO event=job_completed exit_code=0 message="production is unavailable"',
    'METRIC requests=100 failed_requests=0 reason=CrashLoopBackOff',
    'INFO message="requests=500 failed_requests=500 production',
  ])assert.notEqual(analyze(source).actionability,'Likely Noise',source);
  for(const source of [
    'INFO message="METRIC production requests=500 failed_requests=500"',
    '{"level":"info","message":"\\\"requests\\\":500,\\\"failed_requests\\\":500 production"}',
  ])assert.notEqual(analyze(source).severity,'Critical');
});
test('causal contradiction is not hidden by a malformed corroborating audit',()=>{
  const source='ERROR service=api container exited code=1: required environment variable DB_HOST missing\nINFO service=api event=config_audit DB_HOST_present=false\nINFO service=api event=config_audit DB_HOST_present=true DB_HOST_present=false';
  assert.equal(analyze(source).confidence,'Low');
});
test('recovery requires all retries to have a later same-operation success',()=>{
  const source='2026-10-28T10:00:00Z WARN service=payments request_id=a event=upstream_timeout\n2026-10-28T10:00:01Z INFO service=payments request_id=b event=retry_succeeded status=200\n2026-10-28T10:00:02Z METRIC service=payments requests=50 failed_requests=0';
  assert.equal(analyze(source).actionability,'Investigate');
});
test('different direct diagnostics do not become an unqualified single root cause',()=>{
  const source='ERROR service=api container exited code=1: required environment variable DB_HOST missing\nFATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory';
  assert.equal(analyze(source).confidence,'Low');assert.match(analyze(source).rootCause,/Multiple diagnostic/);
});
test('negating data loss does not negate a direct memory diagnostic',()=>{
  const source='FATAL ERROR: JavaScript heap out of memory; no data loss observed';
  assert.equal(analyze(source).confidence,'Medium');assert.match(analyze(source).rootCause,/memory exhaustion/);
});
test('structured simulation metadata cannot manufacture production impact',()=>{
  for(const source of ['METRIC event=simulation environment=production requests=200 failed_requests=200',
    '{"level":"error","environment":"production","simulation":true,"requests":200,"failed_requests":200}']) {
    assert.equal(analyze(source).actionability,'Investigate');assert.notEqual(analyze(source).severity,'Critical');
  }
});
test('derived diagnosis cannot exceed the public contract after normalization',()=>{
  const variable='DB_'+'X'.repeat(3870);
  const source=`ERROR service=api container exited code=1: required environment variable ${variable} missing\nINFO service=api event=config_audit ${variable}_present=false`;
  assert.ok(source.split('\n').every(line=>line.length<4000));
  assert.throws(()=>analyze(source,'cautious'),{code:'AI_INVALID_RESPONSE'});
});
