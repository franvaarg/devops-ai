type AnalysisPanelProps = {
  severity: string;
  summary: string;
  rootCause: string;
  recommendation: string;
  steps: string[];
};

function AnalysisPanel({
  severity,
  summary,
  rootCause,
  recommendation,
  steps,
}: AnalysisPanelProps) {
  return (
    <section style={{ marginTop: "32px" }}>
      <h2>Latest Analysis</h2>

      <p><strong>Severity:</strong> {severity || "No severity yet."}</p>
      <p><strong>Summary:</strong> {summary || "No analysis yet."}</p>
      <p><strong>Root Cause:</strong> {rootCause || "Pending."}</p>
      <p><strong>Recommendation:</strong> {recommendation || "Pending."}</p>

      <strong>Suggested Steps:</strong>
      {steps.length > 0 ? (
        <ul>
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ul>
      ) : (
        <p>No steps yet.</p>
      )}
    </section>
  );
}

export default AnalysisPanel;