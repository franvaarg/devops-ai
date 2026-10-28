// OFFLINE ONLY. This does not import an AI adapter, SDK, dotenv or database.
const { writeFileSync, readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const cases = require('./reliability-cases.cjs');
const { parseAnalysis } = require('../src/services/analysisContract');
const { redactSecrets } = require('../src/security/redactSecrets');

function candidate(source, mode) {
  // Identical proposals for every case. No expected outcome enters this function.
  return { severity: mode === 'dismissive' ? 'Low' : 'Medium',
    actionability: mode === 'dismissive' ? 'Likely Noise' : 'Investigate',
    confidence: mode === 'dismissive' ? 'High' : mode === 'cautious' ? 'Low' : 'Medium',
    summary: 'The incident is resolved.', evidence: mode === 'cautious' ? [] : [source.split('\n')[0]],
    rootCause: 'Definitely a network failure.', falsePositiveRisk: 'High', noiseAssessment: 'Everything recovered.',
    recommendation: mode === 'dismissive' ? 'DROP DATABASE production;' : 'Check health',
    steps: ['Inspect logs'], missingInformation: [], verificationSteps: ['Check health'] };
}
function assess(entry, result, source) {
  const expected=entry.expected;
  const claimedRecovery=/(?:shows|supports?)\b[^.]*\b(?:retry success|benign recovery)|\b(?:has|is|was) (?:recovered|resolved)\b/i.test(result.summary+' '+result.noiseAssessment);
  const steps=[result.recommendation,...result.steps,...result.verificationSteps].join('\n');
  return {
    severity:result.severity===expected.severity,
    actionability:result.actionability===expected.actionability,
    falsePositiveRisk:result.falsePositiveRisk===expected.falsePositiveRisk,
    evidenceGrounded:result.evidence.every(e=>source.includes(e)),
    requiredSupport:expected.supportLines.every(index=>result.evidence.some(e=>e.includes(source.split('\n')[index]))),
    rootCausePlausible:new RegExp(expected.cause,'i').test(result.rootCause),
    remediationUseful:new RegExp(expected.remediation,'i').test(steps),
    confidenceSupported:result.confidence===expected.confidence,
    noUnsupportedCertainty:!/(?:definitely|certainly|confirmed root cause|conclusively)/i.test(result.rootCause),
    noUnsupportedRecovery:!claimedRecovery || expected.truth==='benign',
    dangerousActionContained:!/(?:DROP DATABASE|rm -rf|terraform destroy)/i.test(steps),
  };
}
function matrix(rows, key) {
  const result={};
  for(const row of rows) {
    const expected=row.expected[key], actual=row.result?.[key]||'INVALID';
    result[expected] ||= {}; result[expected][actual]=(result[expected][actual]||0)+1;
  }
  return result;
}
function percentile(values,p) {
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return Number(sorted[Math.max(0,Math.ceil(p*sorted.length)-1)].toFixed(3));
}
function summarize(rows) {
  const neutral=rows.filter(r=>r.mode==='neutral');
  const ranks=['Low','Medium','High'];
  const valid=neutral.filter(r=>r.result);
  const counters={},allVariantChecks={};
  for(const key of Object.keys(neutral.find(r=>r.checks)?.checks||{})) {
    counters[key]={passed:neutral.filter(r=>r.checks?.[key]).length,total:neutral.length};
    allVariantChecks[key]={passed:rows.filter(r=>r.checks?.[key]).length,total:rows.length};
  }
  const bins=Object.fromEntries(ranks.map(label=>{
    const group=valid.filter(r=>r.result.confidence===label);
    return [label,{count:group.length,rootCauseRubricPassed:group.filter(r=>r.checks.rootCausePlausible).length,
      supportLabelMatches:group.filter(r=>r.checks.confidenceSupported).length}];
  }));
  return {uniqueCases:neutral.length,variants:rows.length,counters,allVariantChecks,
    severityMatrix:matrix(neutral,'severity'),actionabilityMatrix:matrix(neutral,'actionability'),confidenceMatrix:matrix(neutral,'confidence'),
    confidenceBins:bins,
    overconfidence:valid.filter(r=>ranks.indexOf(r.result.confidence)>ranks.indexOf(r.expected.confidence)).length,
    underconfidence:valid.filter(r=>ranks.indexOf(r.result.confidence)<ranks.indexOf(r.expected.confidence)).length,
    criticalAsHarmless:rows.filter(r=>r.expected.severity==='Critical'&&r.result?.actionability==='Likely Noise').map(r=>({id:r.id,mode:r.mode})),
    criticalUndertriage:neutral.filter(r=>r.expected.severity==='Critical'&&(!r.checks?.severity||!r.checks?.actionability)).map(r=>r.id),
    incidentMisses:neutral.filter(r=>r.expected.truth==='incident'&&r.result?.actionability!=='Action Required').map(r=>r.id),
    benignInvestigations:neutral.filter(r=>r.expected.truth==='benign'&&r.result?.actionability!=='Likely Noise').map(r=>r.id),
    falsePositiveActionRequired:neutral.filter(r=>r.expected.truth==='benign'&&r.result?.actionability==='Action Required').map(r=>r.id),
    failures:neutral.filter(r=>!r.checks||Object.values(r.checks).some(v=>!v)).map(r=>({id:r.id,checks:r.checks?Object.keys(r.checks).filter(k=>!r.checks[k]):['invalid']})),
    stressFailures:rows.filter(r=>r.mode!=='neutral'&&(!r.checks||!r.checks.evidenceGrounded||!r.checks.noUnsupportedCertainty||!r.checks.noUnsupportedRecovery||!r.checks.dangerousActionContained)).map(r=>({id:r.id,mode:r.mode})),
    stressExpectationFailures:rows.filter(r=>r.mode!=='neutral'&&(!r.checks||Object.values(r.checks).some(v=>!v))).map(r=>({id:r.id,mode:r.mode,checks:r.checks?Object.keys(r.checks).filter(k=>!r.checks[k]):['invalid']})),
    harnessLatencyMs:{p50:percentile(rows.map(r=>r.durationMs),.5),p95:percentile(rows.map(r=>r.durationMs),.95),max:percentile(rows.map(r=>r.durationMs),1)},
  };
}
function evaluate() {
  const rows=[];
  for(const entry of cases) {
    if(!entry.rationale||!entry.synthetic||Buffer.byteLength(entry.log)>16384) throw new Error('Invalid benchmark fixture');
    for(const mode of ['neutral','dismissive','cautious']) {
      const source=redactSecrets(entry.log), start=performance.now();
      const row={id:entry.id,category:entry.category,mode,expected:entry.expected};
      try {row.result=parseAnalysis(JSON.stringify(candidate(source,mode)),source,true);row.checks=assess(entry,row.result,source);}
      catch(error){row.errorCode=error.code||'UNEXPECTED';}
      row.durationMs=Number((performance.now()-start).toFixed(3));rows.push(row);
    }
  }
  return {timestamp:new Date().toISOString(),datasetSha256:createHash('sha256').update(readFileSync(require.resolve('./reliability-cases.cjs'))).digest('hex'),status:'VERIFIED OFFLINE',synthetic:true,providerCalls:0,databaseWrites:false,
    scope:'Deterministic backend contract/policy under scripted candidate responses. NOT Gemini diagnostic accuracy or statistical probability calibration.',
    groundTruth:'Engineer-authored scenario facts/rationales, not model-generated labels. No independent external adjudication has been performed. Negated-cause grading was strengthened without changing its expected labels.',
    empiricalCalibration:'NOT VERIFIED: qualitative support-label compliance is not statistical confidence calibration.',
    summary:summarize(rows),results:rows};
}
if(require.main===module) {
  const output=process.argv[process.argv.indexOf('--output')+1];
  if(!process.argv.includes('--output')||!output)throw new Error('Specify --output PATH; this runner never calls providers.');
  const report=evaluate();writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report.summary,null,2));
  if(report.summary.failures.length||report.summary.stressExpectationFailures.length||report.summary.criticalAsHarmless.length)process.exitCode=1;
}
module.exports={candidate,assess,summarize,evaluate};
