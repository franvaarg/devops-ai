import { useState } from 'react';

const examples = [
  { name: 'Failing orders', log: '10:42 WARN legacy cache API deprecated\n10:43 ERROR database connection refused\n10:43 GET /orders 503\n10:44 GET /orders 503', action: 'Action Required', severity: 'High', confidence: 'Medium', risk: 'Low', summary: 'Orders are failing. The warning may be unrelated.', cause: 'Connection failures coincide with repeated 503 responses. Database unavailability is a possible cause; the excerpt does not establish why it failed.', evidence: '10:43 GET /orders 503', next: 'Check database health and connectivity from the application before changing configuration.' },
  { name: 'Recovered retry', log: '10:42 WARN legacy cache API deprecated\n10:43 ERROR cache refresh timeout; retry scheduled\n10:44 INFO cache refresh retry succeeded\n10:45 INFO requests=100 failures=0', action: 'Likely Noise', severity: 'Low', confidence: 'Low', risk: 'High', summary: 'The refresh recovered. No request failures are shown.', cause: 'The initial timeout cause is unknown. Recovery and successful requests support a low-impact assessment of this window.', evidence: '10:44 INFO cache refresh retry succeeded', next: 'Confirm retries are expected and check latency before dismissing repeated timeouts.' },
  { name: 'Missing context', log: 'ERROR payment dependency request timeout', action: 'Investigate', severity: 'Medium', confidence: 'Low', risk: 'High', summary: 'A timeout needs context before escalation.', cause: 'One timeout does not establish failed payments, an outage or a root cause. Recovery, environment and customer impact were not supplied.', evidence: 'ERROR payment dependency request timeout', next: 'Collect adjacent timestamps, retry outcomes and failed-request counts.' },
];

export default function PublicDemo() {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const example = examples[selected];
  return <aside id="demo" className="demo" aria-label="Interactive incident demonstration">
    <p className="eyebrow">Interactive demo · synthetic logs</p>
    <label htmlFor="demo-scenario" className="block text-sm font-semibold">Explore a scenario</label>
    <select id="demo-scenario" value={selected} onChange={event => setSelected(Number(event.target.value))} className="my-3 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900">
      {examples.map((entry, index) => <option key={entry.name} value={index}>{entry.name}</option>)}
    </select>
    <pre>{example.log}</pre>
    <div aria-live="polite">
      <div className="decision-grid">{[['Actionability', example.action], ['Severity', example.severity], ['Confidence', example.confidence], ['False-positive risk', example.risk]].map(([label, value]) => <div key={label}>{label}<strong>{value}</strong></div>)}</div>
      <h3>{example.summary}</h3><p>{example.cause}</p><p><strong>Next:</strong> {example.next}</p>
    </div>
    <button aria-expanded={expanded} aria-controls="demo-evidence" onClick={() => setExpanded(value => !value)}>{expanded ? 'Hide source evidence' : 'Inspect source evidence'}</button>
    {expanded && <div id="demo-evidence" className="mt-3"><pre>{example.evidence}</pre><p className="fine">This excerpt is copied directly from the selected synthetic log.</p></div>}
    <p className="fine">Prepared examples demonstrate the workflow. No AI call, upload or account is used here. Real analyses can differ.</p>
  </aside>;
}
