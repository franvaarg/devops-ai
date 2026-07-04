type AnalysisPanelProps = {
  summary: string;
  recommendation: string;
};

function AnalysisPanel({ summary, recommendation }: AnalysisPanelProps) {
  return (
    <section style={{ marginTop: "32px" }}>
      <h2>Latest Analysis</h2>
      <p><strong>Summary:</strong> {summary || "No analysis yet."}</p>
      <p><strong>Recommendation:</strong> {recommendation || "Pending."}</p>
    </section>
  );
}

export default AnalysisPanel;