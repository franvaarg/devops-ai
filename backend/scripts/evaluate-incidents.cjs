// Synthetic provider evaluation. Never reads production logs or writes a database.
require('dotenv').config({quiet:true});
const { writeFileSync } = require('node:fs');
const cases = require('./incident-cases.cjs');
const { redactSecrets } = require('../src/security/redactSecrets');
const { performance } = require('node:perf_hooks');
const { supportedEvidence } = require('../src/services/analysisSafety');
function score(entry, result) {
 const source = redactSecrets(entry.log);
 const prose = [result.summary,result.rootCause,result.recommendation,...result.steps,...(result.verificationSteps||[]), result.noiseAssessment || '', ...(result.missingInformation || [])].join('\n');
 return {
  evidenceCorrect: result.evidence.length > 0 && result.evidence.every(e => source.includes(e)) && supportedEvidence(result.evidence, source).length === result.evidence.length,
  requiredEvidence: entry.requiredEvidence.every(required => result.evidence.some(e => e.includes(required))),
  severity: entry.severities.includes(result.severity),
  confidence: entry.confidences.includes(result.confidence),
  decision: entry.expected.includes(result.actionability),
  hypothesis: entry.acceptableHypotheses.some(pattern => new RegExp(pattern,'i').test(result.rootCause)),
  nextSteps: entry.nextStepCategories.every(pattern => new RegExp(pattern,'i').test([...result.steps,...(result.verificationSteps||[])].join('\n'))),
  prohibitedHallucination: result.evidence.some(e => !source.includes(e)) || entry.prohibitedHallucinations.some(pattern => new RegExp(pattern,'i').test(prose)),
  trustFields: Array.isArray(result.missingInformation) && result.verificationSteps?.length > 0,
 };
}
async function main() {
 if (process.argv.includes('--fixtures-only')) {
  for(const entry of cases) {
   for(const key of ['name','category','log','expected','severities','confidences','requiredEvidence','acceptableHypotheses','prohibitedHallucinations','nextStepCategories']) {
    if(!entry[key]) throw new Error(`Missing fixture field ${key}`);
   }
   if(!entry.requiredEvidence.every(e=>entry.log.includes(e))) throw new Error('Fixture has invented source evidence');
  }
  console.log(JSON.stringify({fixtures:cases.length,valid:true,providerCalls:0,qualityEvaluated:false})); return;
 }
 if(!process.argv.includes('--live')) throw new Error('Use --fixtures-only or --live.');
 const { analyzeLog } = require('../src/services/aiService');
 const results=[];
 for(const entry of cases) {
  const start=performance.now();
  try {
   const result=await analyzeLog(entry.log,entry.context); const checks=score(entry,result);
   results.push({name:entry.name,category:entry.category,durationMs:Math.round(performance.now()-start),structuredValid:true,ok:Object.entries(checks).every(([key,value])=>key==='prohibitedHallucination'?!value:value),checks,result});
  } catch(error) {results.push({name:entry.name,category:entry.category,durationMs:Math.round(performance.now()-start),structuredValid:false,ok:false,errorCode:error.code||'UNAVAILABLE'});}
 }
 const report={timestamp:new Date().toISOString(),synthetic:true,databaseWrites:false,model:process.env.GEMINI_MODEL||'gemini-3.6-flash',
  limitations:'Automated rubric checks are proxies. Root-cause correctness, diagnostic usefulness, and uncaught hallucinations require human review. Confidence is qualitative, not calibrated.',
  metrics:summarize(results),results};
 writeFileSync(process.env.EVALUATION_REPORT||'/tmp/kanyi-live-evaluation.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report.metrics)); if(results.some(r=>!r.ok))process.exitCode=1;
}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1});
function summarize(results) {
 const count=results.length, successful=results.filter(r=>r.structuredValid);
 const rate=(n, denominator=count)=>denominator ? Number((100*n/denominator).toFixed(1)) : null;
 const quality=n=>rate(n,successful.length);
 const ranks=['Low','Medium','High'];
 const confidenceFailures=(direction)=>successful.filter(r=>{
  const entry=cases.find(c=>c.name===r.name);
  if(!entry) return false;
  const actual=ranks.indexOf(r.result.confidence), allowed=entry.confidences.map(c=>ranks.indexOf(c));
  return direction==='over' ? actual>Math.max(...allowed) : actual<Math.min(...allowed);
 }).length;
 return {attempted:count,validAnalyses:successful.length,
  functionalSuccessPercent:rate(results.filter(r=>r.ok).length),structuredValidityPercent:rate(successful.length),
  evidenceCorrectPercent:quality(successful.filter(r=>r.checks.evidenceCorrect).length),
  requiredEvidencePercent:quality(successful.filter(r=>r.checks.requiredEvidence).length),
  usefulnessRubricPercent:quality(successful.filter(r=>r.checks.hypothesis&&r.checks.nextSteps).length),
  humanDiagnosticUsefulness:'NOT REVIEWED',
  overconfidenceFailures:successful.length ? confidenceFailures('over') : null,
  underconfidenceFailures:successful.length ? confidenceFailures('under') : null,
  hallucinationRubricFailures:successful.length ? successful.filter(r=>r.checks.prohibitedHallucination).length : null,
  providerFailures:results.filter(r=>r.errorCode&&r.errorCode!=='AI_INVALID_RESPONSE').length,
  invalidOutputs:results.filter(r=>r.errorCode==='AI_INVALID_RESPONSE').length,
  meanLatencyMs:count ? Math.round(results.reduce((n,r)=>n+r.durationMs,0)/count) : null,
  maxLatencyMs:count ? Math.max(...results.map(r=>r.durationMs)) : null};
}
module.exports={score,summarize};
