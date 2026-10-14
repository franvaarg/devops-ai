// Explicit opt-in live provider evaluation. Synthetic data only; no database writes.
if (!process.argv.includes('--live')) { console.error('Use --live to send the synthetic evaluation cases to the configured Gemini project.'); process.exit(1); }
require('dotenv').config({quiet:true});
const { writeFileSync } = require('node:fs');
const { analyzeLog } = require('../src/services/aiService');
const { context } = require('../src/operations/logger');
const { randomUUID } = require('node:crypto');
const cases = require('./incident-cases.cjs');

(async()=>{
 const results=[];
 for(const entry of cases){
  const start=Date.now(); const requestId = randomUUID();
  try{ const result=await context.run({ requestId }, () => analyzeLog(entry.log,entry.context)); const ok=entry.expected.includes(result.actionability) && result.evidence.every(e=>entry.log.includes(e)) && entry.severities.includes(result.severity) && entry.confidences.includes(result.confidence) && result.steps.length > 0 && (result.evidence.length > 0 || result.actionability === 'Insufficient Evidence');
    results.push({name:entry.name,category:entry.category,requestId,ok,durationMs:Date.now()-start,result});
  }catch(e){results.push({name:entry.name,category:entry.category,requestId,ok:false,durationMs:Date.now()-start,errorCode:e.code||'UNAVAILABLE'});}
 }
 const report={timestamp:new Date().toISOString(),synthetic:true,databaseWrites:false,rubric:'Expected actionability/severity/root-cause confidence bounds, exact evidence provenance and nonempty remediation steps; root-cause/remediation usefulness requires human review.',thinkingLevel:"LOW for supported 3.x Flash models",model:process.env.GEMINI_MODEL||'gemini-3.6-flash',results};
 writeFileSync(process.env.EVALUATION_REPORT||'/tmp/kanyi-live-evaluation.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));if(results.some(r=>!r.ok))process.exitCode=1;
})().catch(()=>{console.error('Evaluation could not complete.');process.exitCode=1});
