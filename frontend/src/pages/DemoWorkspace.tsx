import { useState } from "react";
import Header from "../components/Header";
import IncidentWorkspace from "../components/IncidentWorkspace";
import LogInput from "../components/LogInput";
import AnalyzeButton from "../components/AnalyzeButton";
import AnalysisPanel from "../components/AnalysisPanel";
import { syntheticExamples } from "../data/syntheticExamples";

export default function DemoWorkspace() {
  const [selected, setSelected] = useState<number | null>(0);
  const [assessment, setAssessment] = useState<number | null>(0);
  const [message, setMessage] = useState("");
  const sample = selected === null ? null : syntheticExamples[selected];
  const result = assessment === null ? null : syntheticExamples[assessment];

  return (
    <main className="product-shell">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <div className="app-topbar">
        <a className="app-brand" href="/">
          <span>K</span>KANYI
          <span className="app-product-label">SYNTHETIC DEMO</span>
        </a>
        <a className="rounded border px-4 py-2 text-sm" href="/">
          Back to Home
        </a>
      </div>
      <div className="app-layout">
        <nav className="app-rail" aria-label="Demo navigation">
          <p className="section-kicker">Workspace</p>
          <a href="#workspace" aria-current="location">
            <span className="rail-index">01</span>
            <span>Investigate</span>
          </a>
          <a href="/">
            <span className="rail-index">02</span>
            <span>Back to Home</span>
          </a>
          <div className="rail-note">
            Prepared synthetic examples.
            <br />
            No live AI analysis.
          </div>
        </nav>
        <div className="app-content">
          <Header />
          <p className="analysis-progress">
            Synthetic demonstration. Prepared sample assessments run locally in
            your browser. No live AI analysis, uploads, login, or payment. Only
            synthetic sample logs are available.
          </p>
          <IncidentWorkspace
            detail="SYNTHETIC INPUT"
            input={
              <>
                <label
                  htmlFor="workspace-scenario"
                  className="mb-2 block text-sm font-semibold"
                >
                  Choose sample logs
                </label>
                <select
                  id="workspace-scenario"
                  className="mb-5 w-full rounded border border-slate-700 bg-slate-950 p-3 text-slate-100"
                  value={selected ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelected(value === "" ? null : Number(value));
                    setAssessment(null);
                    setMessage(
                      "Sample changed. Show its prepared assessment to inspect the evidence.",
                    );
                  }}
                >
                  <option value="">Choose a synthetic scenario</option>
                  {syntheticExamples.map((entry, index) => (
                    <option key={entry.name} value={index}>
                      {entry.name}
                    </option>
                  ))}
                </select>
                <LogInput
                  log={sample?.log ?? ""}
                  setLog={() => {}}
                  readOnly
                  placeholder="Choose a synthetic scenario above to load sample logs."
                />
                <p className="data-notice">
                  Read-only synthetic sample. Select a scenario above to change
                  the log. Your own logs are not accepted or processed.
                </p>
                <AnalyzeButton
                  label="Show sample assessment"
                  isLoading={false}
                  onAnalyze={() => {
                    setAssessment(selected);
                    setMessage(
                      selected === null
                        ? "Choose sample logs before showing an assessment."
                        : "Prepared sample assessment shown. No AI or backend request was made.",
                    );
                  }}
                  onClear={() => {
                    setSelected(null);
                    setAssessment(null);
                    setMessage("Demo cleared. Choose sample logs to continue.");
                  }}
                />
                <p role="status" className="data-notice">
                  {message}
                </p>
              </>
            }
          >
            <AnalysisPanel
              emptyDescription="Choose synthetic sample logs, then show their prepared assessment. No live AI analysis is performed."
              severity={result?.severity ?? ""}
              summary={result?.summary ?? ""}
              evidence={result ? [result.evidence] : []}
              rootCause={result?.cause ?? ""}
              confidence={result?.confidence ?? ""}
              recommendation={result?.next ?? ""}
              steps={result ? [result.next] : []}
              actionability={result?.action}
              falsePositiveRisk={result?.risk}
              missingInformation={
                result
                  ? [
                      "These prepared examples do not establish current system health or customer impact.",
                    ]
                  : []
              }
              verificationSteps={result ? [result.next] : []}
              noiseAssessment={result?.cause}
            />
          </IncidentWorkspace>
        </div>
      </div>
    </main>
  );
}
