import { useState } from 'react';
import { DecisionMetrics, EvidencePanel, SourceExcerpt } from './ui/Workspace';

import { syntheticExamples as examples } from '../data/syntheticExamples';

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
    <SourceExcerpt>{example.log}</SourceExcerpt>
    <div aria-live="polite">
      <DecisionMetrics actionability={example.action} severity={example.severity} confidence={example.confidence} risk={example.risk} />
      <h3>{example.summary}</h3><EvidencePanel title="Potential cause:"><p>{example.cause}</p></EvidencePanel><EvidencePanel title="Recommended next step:"><p>{example.next}</p></EvidencePanel>
    </div>
    <button aria-expanded={expanded} aria-controls="demo-evidence" onClick={() => setExpanded(value => !value)}>{expanded ? 'Hide source evidence' : 'Inspect source evidence'}</button>
    {expanded && <div id="demo-evidence" className="mt-3"><SourceExcerpt>{example.evidence}</SourceExcerpt><p className="fine">This excerpt is copied directly from the selected synthetic log.</p></div>}
    <p className="fine">Prepared synthetic examples, not live AI analysis. This free demo runs locally in your browser without login, uploads, backend requests, or payments. Real analyses can differ.</p>
  </aside>;
}
