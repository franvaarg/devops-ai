const DIAGNOSTICS = Object.freeze({
  general:'Inspect service health, error rates and adjacent timestamped logs using read-only tools.',
  configuration:'Inspect the configuration and diagnostic event named in the evidence using read-only tools.',
  database:'Inspect database health and application connection errors using read-only tools.',
  pool:'Inspect database connection pool limits, active connections and waiting requests using read-only tools.',
  memory:'Inspect memory and heap metrics and allocation traces using read-only tools.',
  disk:'Inspect disk capacity, free space and write-error logs using read-only tools.',
  dns:'Inspect DNS resolution, hostname configuration and resolver logs using read-only tools.',
  authentication:'Inspect database authentication settings and credential configuration using read-only tools.',
  authorization:'Inspect required scopes, identity permissions and authorization policy using read-only tools.',
  image:'Inspect image references, registry manifests and deployment configuration using read-only tools.',
  dependency:'Inspect dependency versions and lockfile consistency using read-only tools.',
  runtime:'Inspect the failing handler trace and undefined-value access using read-only tools.',
  container:'Inspect container exit logs, pod status and readiness observations using read-only tools.',
});
function diagnosis(rows) {
  const matches=[];
  const add=(row,kind,explanation,confidence='Medium',support=[row])=>matches.push({row,kind,explanation,confidence,support});
  for(const row of rows) {
    const negated=/\b(?:no|not|without|ruled out)\b[^.;:\n]{0,48}\b(?:out of memory|memory exhaustion|missing|authentication failure|authentication failed|ENOTFOUND)\b/i.test(row.plain) || /\b(?:out of memory|memory exhaustion)\b[^.;:\n]{0,24}\b(?:did not occur|not observed|ruled out)\b/i.test(row.plain);
    if(!row.eligible || negated)continue;
    const error=/^(?:(?:ERROR|FATAL)\b|TypeError:|npm ERR!)/i.test(row.plain);
    if(!error)continue;
    const variable=/\brequired environment variable ([A-Z][A-Z0-9_]*) missing\b|\bMissing required environment variable ([A-Z][A-Z0-9_]*)\b/.exec(row.plain);
    if(variable) {
      const name=variable[1]||variable[2];
      const audits=rows.filter(other=>other.diagnostic && row.service && other.service===row.service && other.event==='config_audit' && other.get(`${name}_present`)!==undefined);
      if(audits.some(other=>other.conflict||String(other.get(`${name}_present`))==='true')) {
        add(row,'configuration',`Configuration observations contradict the reported missing ${name}; the cause is unverified.`, 'Low',[row,...audits]);
      } else {
        const corroborated=audits.some(other=>other.eligible&&String(other.get(`${name}_present`))==='false');
        add(row,'configuration',`The supplied log reports required environment variable ${name} missing. ${corroborated?'A separate same-service configuration audit corroborates this proximate startup cause in the supplied window.':'This supports a configuration failure in this window.'}`,corroborated?'High':'Medium',[row,...audits]);
      }
    }
    if(/\b(?:heap out of memory|out of memory|Reached heap limit Allocation failed)\b/i.test(row.plain)) add(row,'memory','The supplied log reports memory exhaustion. The cause of the memory growth is unknown.');
    if(/\bpassword authentication failed\b/i.test(row.plain))add(row,'authentication','The supplied log reports rejected database authentication. The credential or configuration responsible is unknown.');
    if(/\bgetaddrinfo ENOTFOUND\b/.test(row.plain))add(row,'dns','The supplied log reports DNS resolution failure. The underlying DNS or hostname configuration cause is unknown.');
    if(row.event==='pool_timeout'&&row.poolMax>0&&row.poolActive===row.poolMax&&row.poolWaiting>0)add(row,'pool','The observed connection pool is saturated with waiting requests and a pool timeout. Why connections remain occupied is unverified.');
    if(row.get('errno')==='ENOSPC'&&row.event==='write_failed')add(row,'disk','A write failed because device space was unavailable (ENOSPC). Verify disk capacity and the reason space was exhausted.');
    if(row.event==='access_denied'&&row.get('required_scope'))add(row,'authorization','The log reports authorization denied for a required scope. The identity and policy configuration require verification.');
    if(/^TypeError: Cannot read properties of undefined\b/.test(row.plain))add(row,'runtime','The trace reports an undefined-value access. Why the value was absent is unverified.');
    if(/\bregistry manifest unknown\b/i.test(row.plain))add(row,'image','The registry reports an unavailable image manifest. Verify the image reference and registry metadata before changing the deployment.');
    if(/^npm ERR!.*\b(?:ERESOLVE|unable to resolve dependency tree)\b/.test(row.plain))add(row,'dependency','The package manager reports dependency resolution failure. The correct version combination requires verification.');
  }
  const unique=[...new Map(matches.map(item=>[item.explanation,item])).values()];
  if(unique.length>1) return {kind:'general',row:unique[0].row,confidence:'Low',support:unique.flatMap(item=>item.support),explanation:'Multiple diagnostic mechanisms are reported; their causal ordering and underlying root cause are unverified.'};
  return unique[0]||null;
}
function ordered(rows) {
  return rows.length>0&&rows.every((row,i)=>row.eligible&&Number.isFinite(row.clock)&&row.clockType===rows[0].clockType&&(!i||row.clock>=rows[i-1].clock));
}
function scopedRecovery(rows) {
  if(!ordered(rows)||rows.some(row=>row.impact||row.conflict))return false;
  const failures=rows.filter(row=>row.event==='upstream_timeout');
  if(!failures.length)return false;
  const last=rows.at(-1),service=failures[0].service;
  if(!service||last.service!==service||!(last.total>0&&last.failed===0))return false;
  for(const failure of failures) {
    const id=failure.get('request_id');
    if(!id||failure.service!==service)return false;
    const success=rows.find(row=>row.service===service&&row.get('request_id')===id&&row.event==='retry_succeeded'&&Number(row.get('status'))===200&&row.line>failure.line&&row.clock>failure.clock);
    if(!success||last.clock<success.clock)return false;
  }
  return rows.every(row=>row.service===service&&(row.event==='upstream_timeout'||row.event==='retry_succeeded'||row===last));
}
function resourceImpact(rows) {
  for(const row of rows) {
    if(!row.eligible||!row.service||row.event!=='write_failed'||row.get('errno')!=='ENOSPC')continue;
    const disk=rows.find(other=>other.eligible&&other.service===row.service&&other.availableBytes===0);
    if(disk){row.impact=true;row.major=true;row.resourceSupport=disk;}
  }
}
function diagnosticFor(rows,cause) {
  if(cause)return DIAGNOSTICS[cause.kind];
  if(rows.some(row=>row.dbFailure))return DIAGNOSTICS.database;
  if(rows.some(row=>row.poolMax!==undefined||row.poolWaiting!==undefined))return DIAGNOSTICS.pool;
  if(rows.some(row=>row.get('disk_used_percent')!==undefined||row.availableBytes!==undefined))return DIAGNOSTICS.disk;
  if(rows.some(row=>row.get('reason')==='CrashLoopBackOff'))return DIAGNOSTICS.container;
  return DIAGNOSTICS.general;
}
module.exports={diagnosis,scopedRecovery,resourceImpact,diagnosticFor,DIAGNOSTICS};
