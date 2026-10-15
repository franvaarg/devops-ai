// Synthetic provider evaluation. Never reads production logs or writes a database.
require('dotenv').config({quiet:true});
const { writeFileSync } = require('node:fs');
const cases = require('./incident-cases.cjs');
const { redactSecrets } = require('../src/security/redactSecrets');
const { performance } = require('node:perf_hooks');
function score(entry, result) {
 const source = redactSecrets(entry.log);
 const prose = [result.summary,result.rootCause,result.recommendation,...result.steps,...(result.verificationSteps||[])].join('\n');
 return {
  evidenceCorrect: result.evidence.every(e => source.includes(e)),
  requiredEvidence: entry.requiredEvidence.every(required => result.evidence.some(e => e.includes(required) || required.includes(e))),
  severity: entry.severities.includes(result.severity),
  confidence: entry.confidences.includes(result.confidence),
  decision: entry.expected.includes(result.actionability),
  hypothesis: entry.acceptableHypotheses.some(pattern => new RegExp(pattern,'i').test(result.rootCause)),
  nextSteps: entry.nextStepCategories.every(pattern => new RegExp(pattern,'i').test([...result.steps,...(result.verificationSteps||[])].join('\n'))),
  prohibitedHallucination: entry.prohibitedHallucinations.some(pattern => new RegExp(pattern,'i').test(prose)),
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
 const count=results.length, successful=results.filter(r=>r.structuredValid);
 const rate=n=>Number((100*n/count).toFixed(1));
 const report={timestamp:new Date().toISOString(),synthetic:true,databaseWrites:false,model:process.env.GEMINI_MODEL||'gemini-3.6-flash',
  limitations:'Automated rubric checks are proxies. Root-cause correctness, diagnostic usefulness, and uncaught hallucinations require human review. Confidence is qualitative, not calibrated.',
  metrics:{functionalSuccessPercent:rate(results.filter(r=>r.ok).length),structuredValidityPercent:rate(successful.length),
   evidenceCorrectPercent:rate(successful.filter(r=>r.checks.evidenceCorrect).length),requiredEvidencePercent:rate(successful.filter(r=>r.checks.requiredEvidence).length),
   usefulnessRubricPercent:rate(successful.filter(r=>r.checks.hypothesis&&r.checks.nextSteps).length),humanDiagnosticUsefulness:'NOT REVIEWED',
   overconfidenceFailures:successful.filter(r=>!r.checks.confidence).length,hallucinationRubricFailures:successful.filter(r=>r.checks.prohibitedHallucination||!r.checks.evidenceCorrect).length,
   providerFailures:results.filter(r=>r.errorCode&&r.errorCode!=='AI_INVALID_RESPONSE').length,invalidOutputs:results.filter(r=>r.errorCode==='AI_INVALID_RESPONSE').length,
   meanLatencyMs:Math.round(results.reduce((n,r)=>n+r.durationMs,0)/count),maxLatencyMs:Math.max(...results.map(r=>r.durationMs))},results};
 writeFileSync(process.env.EVALUATION_REPORT||'/tmp/kanyi-live-evaluation.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report.metrics)); if(results.some(r=>!r.ok))process.exitCode=1;
}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={score};
