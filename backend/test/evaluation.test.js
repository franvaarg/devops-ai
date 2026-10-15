const test = require('node:test');
const assert = require('node:assert/strict');
const cases = require('../scripts/incident-cases.cjs');
const { score } = require('../scripts/evaluate-incidents.cjs');
test('incident rubric detects fabricated evidence, overconfidence and unsupported executed commands', () => {
 const entry=cases.find(e=>e.name==='insufficient-impact-context');
 const result={severity:'Low',confidence:'High',actionability:'Investigate',summary:'I executed a restart',rootCause:'Possible timeout',recommendation:'Check status',steps:['Verify impact'],evidence:['invented outage'],missingInformation:['Environment'],verificationSteps:['Check health']};
 const checks=score(entry,result);
 assert.equal(checks.evidenceCorrect,false); assert.equal(checks.confidence,false); assert.equal(checks.prohibitedHallucination,true);
});
test('every incident fixture defines a complete evidence and diagnostic rubric', () => {
 assert.equal(cases.length,28);
 assert.equal(new Set(cases.map(c=>c.name)).size,cases.length);
 for(const entry of cases) {
  for(const key of ['requiredEvidence','acceptableHypotheses','prohibitedHallucinations','nextStepCategories','severities','confidences']) assert.ok(Array.isArray(entry[key]));
  assert.ok(entry.requiredEvidence.every(e=>entry.log.includes(e)));
 }
});
