const test = require('node:test');
const assert = require('node:assert/strict');
const cases = require('../scripts/incident-cases.cjs');
const { score } = require('../scripts/evaluate-incidents.cjs');
const { summarize } = require('../scripts/evaluate-incidents.cjs');
test('incident rubric detects fabricated evidence, overconfidence and unsupported executed commands', () => {
 const entry=cases.find(e=>e.name==='insufficient-impact-context');
 const result={severity:'Low',confidence:'High',actionability:'Investigate',summary:'I executed a restart',rootCause:'Possible timeout',recommendation:'Check status',steps:['Verify impact'],evidence:['invented outage'],missingInformation:['Environment'],verificationSteps:['Check health']};
 const checks=score(entry,result);
 assert.equal(checks.evidenceCorrect,false); assert.equal(checks.confidence,false); assert.equal(checks.prohibitedHallucination,true);
});
test('rubric rejects generic fragments and requires adverse impact evidence', () => {
 const entry=cases.find(e=>e.name==='supported-service-impact');
 const result={severity:'High',confidence:'Low',actionability:'Action Required',summary:'Investigate',rootCause:'Possible connection failure',recommendation:'Check health',steps:['Check health'],evidence:['ERROR'],missingInformation:[],verificationSteps:['Check health']};
 const checks=score(entry,result);
 assert.equal(checks.evidenceCorrect,false);
 assert.equal(checks.requiredEvidence,false);
 const firstLine={...result,evidence:[entry.log.split('\n')[0]]};
 assert.equal(score(entry,firstLine).requiredEvidence,false);
 assert.equal(score(entry,{...result,evidence:[]}).evidenceCorrect,false);
});
test('quality metrics are unevaluated without outputs and conditional on valid analyses', () => {
 const failure={structuredValid:false,errorCode:'AI_RATE_LIMITED',durationMs:1};
 const empty=summarize([failure]);
 assert.equal(empty.functionalSuccessPercent,0);
 for(const key of ['evidenceCorrectPercent','requiredEvidencePercent','usefulnessRubricPercent','overconfidenceFailures','underconfidenceFailures','hallucinationRubricFailures']) assert.equal(empty[key],null);
 const returned={name:'insufficient-impact-context',structuredValid:true,ok:true,durationMs:2,result:{confidence:'Low'},checks:{evidenceCorrect:true,requiredEvidence:true,hypothesis:true,nextSteps:true,prohibitedHallucination:false}};
 const mixed=summarize([failure,returned]);
 assert.equal(mixed.structuredValidityPercent,50);
 assert.equal(mixed.evidenceCorrectPercent,100);
 assert.equal(mixed.overconfidenceFailures,0);
 assert.equal(summarize([{...returned,result:{confidence:'High'}}]).overconfidenceFailures,1);
});
test('every incident fixture defines a complete evidence and diagnostic rubric', () => {
 assert.equal(cases.length,28);
 assert.equal(new Set(cases.map(c=>c.name)).size,cases.length);
 for(const entry of cases) {
  for(const key of ['requiredEvidence','acceptableHypotheses','prohibitedHallucinations','nextStepCategories','severities','confidences']) assert.ok(Array.isArray(entry[key]));
  assert.ok(entry.requiredEvidence.every(e=>entry.log.includes(e)));
 }
});
