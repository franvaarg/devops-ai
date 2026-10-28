// Normalize representation before reasoning. Message/payload strings are never
// recursively parsed as metrics. Ambiguous/duplicate fields fail conservatively.
const keyOf = key => key.replace(/[_-]/g, '').toLowerCase();
function fieldsFrom(body) {
  const fields = new Map();
  let invalid = false, plain = '', structured = false;
  const add = (key, value) => {
    key = keyOf(key);
    if (fields.has(key)) invalid = true;
    fields.set(key, value);
  };
  if (body.startsWith('{')) {
    structured = true;
    try {
      const value = JSON.parse(body);
      if (!value || Array.isArray(value) || Object.values(value).some(v => v !== null && typeof v === 'object')) throw new Error('Non-flat event');
      // Match JSON string tokens with their optional following colon. This does
      // not mistake escaped key-looking text inside a string value for a key.
      const seen = new Set();
      for (const token of body.matchAll(/"(?:[^"\\]|\\.)*"\s*(:)?/g)) {
        if (!token[1]) continue;
        const key = keyOf(JSON.parse(token[0].replace(/\s*:\s*$/, '')));
        if (seen.has(key)) invalid = true;
        seen.add(key);
      }
      for (const [key, item] of Object.entries(value)) add(key, item);
      plain = `${String(fields.get('level') || fields.get('severity') || '').toUpperCase()} ${String(fields.get('event') || '')}`;
    } catch { invalid = true; }
    return { fields, invalid, plain, structured };
  }
  // Walk quoted values atomically; an unterminated quote invalidates the event.
  for (let i = 0; i < body.length;) {
    const match = (i===0||/[\s;]/.test(body[i-1])) ? /^(?:([A-Za-z_][\w.-]*)=)/.exec(body.slice(i)) : null;
    if (match && (i === 0 || /[\s;]/.test(body[i - 1]))) {
      i += match[0].length;
      let value = '';
      if (/["']/.test(body[i] || ' ')) {
        const quote = body[i++]; let closed = false;
        for (; i < body.length; i++) {
          if (body[i] === '\\' && i + 1 < body.length) { value += body[++i]; continue; }
          if (body[i] === quote) { i++; closed = true; break; }
          value += body[i];
        }
        if (!closed) { invalid = true; break; }
      } else {
        const token = /^[^\s;]+/.exec(body.slice(i));
        if (!token) { invalid = true; break; }
        value = token[0]; i += value.length;
      }
      add(match[1], value); plain += ' '; continue;
    }
    if (/["'`]/.test(body[i])) {
      const quote = body[i++]; let closed = false;
      for (; i < body.length; i++) {
        if (body[i] === '\\') { i++; continue; }
        if (body[i] === quote) { i++; closed = true; break; }
      }
      if (!closed) invalid = true;
      plain += ' '; continue;
    }
    plain += body[i++];
  }
  return { fields, invalid, plain, structured };
}
function observations(source) {
  return source.split(/\r?\n/).map((text, index) => {
    const body = text.trim().replace(/^\d{4}-\d\d-\d\dT\S+\s+|^\d\d:\d\d(?::\d\d)?\s+/, '');
    const timestamp = /^(\d{4}-\d\d-\d\dT\S+)|^(\d\d):(\d\d)(?::(\d\d))?\s/.exec(text.trim());
    const clockType = timestamp?.[1] ? 'absolute' : 'time_only';
    let clock = NaN;
    if (timestamp?.[1]) {
      if (/(?:Z|[+-]\d\d:\d\d)$/.test(timestamp[1])) clock = Date.parse(timestamp[1]);
    } else if (timestamp && Number(timestamp[2]) < 24 && Number(timestamp[3]) < 60 && Number(timestamp[4] || 0) < 60) {
      clock = Number(timestamp[2]) * 3600 + Number(timestamp[3]) * 60 + Number(timestamp[4] || 0);
    }
    const parsed = fieldsFrom(body), fields = parsed.fields;
    const get = key => fields.get(keyOf(key));
    let conflict = parsed.invalid;
    const number = (...aliases) => {
      const found = aliases.filter(key => fields.has(keyOf(key)));
      if (!found.length) return undefined;
      if (found.length !== 1) { conflict = true; return undefined; }
      const raw = get(found[0]);
      if (!/^(?:0|[1-9]\d*)$/.test(String(raw)) || !Number.isSafeInteger(Number(raw))) { conflict = true; return undefined; }
      return Number(raw);
    };
    const total = number('requests_total', 'requests', 'completed_requests');
    const failed = number('failed_requests', 'failures');
    const ready = number('ready_replicas', 'availableReplicas');
    const desired = number('desired_replicas');
    const availableBytes = number('disk_available_bytes');
    const poolActive = number('pool_active'), poolMax = number('pool_max'), poolWaiting = number('pool_waiting');
    const event = String(get('event') || '');
    const plain = parsed.plain;
    const external = /\b(?:external|payload|example|fixture|simulation|test|ignore.*instructions)\b/i.test(plain) || ['external_message','payload','simulation','test','example','fixture'].includes(event) || String(get('simulation'))==='true';
    const operational = /^(?:INFO|WARN|ERROR|FATAL|METRIC)\b|^(?:GET|POST|PUT|DELETE|PATCH)\s+\/|^TypeError:|^npm ERR!/i.test(plain);
    const eligible = operational && !external && !conflict;
    const validCounts = Number.isInteger(total) && Number.isInteger(failed) && total > 0 && failed <= total;
    if (Number.isInteger(total) && Number.isInteger(failed) && failed > total) conflict = true;
    const production = get('environment') === 'production' || (!get('environment') && /\bproduction\b/i.test(plain) && !/\b(?:staging|historical|previous|no production)\b/i.test(plain));
    const requestImpact = eligible && !conflict && validCounts && failed > 0;
    const unavailable = eligible && !conflict && Number.isInteger(ready) && desired > 0 && ready === 0;
    const impact = requestImpact || unavailable;
    const major = unavailable || (requestImpact && failed >= 20 && failed / total >= 0.5);
    const critical = major && production && ((requestImpact && failed === total) || (unavailable && String(get('core_service')) === 'true'));
    const requestError = eligible && /^(?:(?:ERROR|WARN)\s+)?(?:GET|POST|PUT|DELETE|PATCH)\s+\/\S+\s+(?:status=)?5\d\d\b/i.test(body);
    const dbFailure = eligible && /\b(?:database|postgres(?:ql)?)\b.*\b(?:connection refused|connection failed|unavailable|authentication failed)\b/i.test(plain);
    const authFailure = eligible && /\b(?:login|authentication|access)\b.*\b(?:failed|failure|rejected|denied)\b/i.test(plain);
    const adverse = eligible && (/^(?:ERROR|FATAL|TypeError:|npm ERR!)\s*\S/i.test(plain) || requestError || dbFailure || authFailure || /\b(?:timeout|deprecated|warning|ImagePullBackOff|unavailable|failed|failure|refused|denied|rejected|crash|fatal|critical|breach)\b/i.test(plain) || /(?:timeout|failed|denied)/.test(event));
    const typedBenign = (event === 'healthcheck' && Number(get('status')) === 200) || (event === 'job_completed' && String(get('exit_code')) === '0');
    const counterOnly = /^(?:METRIC|INFO)(?:\s+production)?\s*$/.test(plain) && validCounts && failed === 0;
    const benignKeys = new Set(['service','environment','level','severity','event','status','exitcode','requests','requeststotal','completedrequests','failedrequests','failures','requestid','timestamp','time']);
    const interpreted = [...fields.keys()].every(key=>benignKeys.has(key));
    const benign = eligible && !conflict && !adverse && interpreted && (/^INFO healthcheck (?:status=200|healthy)$/.test(body) || typedBenign || counterOnly);
    const meaningful = /\S/.test(plain.replace(/^(?:INFO|WARN|ERROR|FATAL|METRIC)\b:?\s*/i,'')) || event || total!==undefined || ready!==undefined || availableBytes!==undefined || poolMax!==undefined ||
      ['disk_used_percent','heap_limit_mb','reason','message','payload'].some(key=>get(key)!==undefined);
    return { text, body, plain, fields, get, clock, clockType, line:index+1, eligible:eligible&&!conflict, conflict, diagnostic:(operational&&!!meaningful)||(parsed.structured&&body.endsWith('}')&&body.length>=8),
      impact, major, critical, requestImpact, unavailable, requestError, dbFailure, authFailure, adverse, benign,
      availableBytes, poolActive, poolMax, poolWaiting, service:String(get('service')||''), event, total, failed };
  }).filter(row => row.text.trim());
}
module.exports = { observations };
