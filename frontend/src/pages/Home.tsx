import { useState } from "react";
import Header from "../components/Header";
import LogInput from "../components/LogInput";
import AnalyzeButton from "../components/AnalyzeButton";
import AnalysisPanel from "../components/AnalysisPanel";

function Home() {
  const [log, setLog] = useState("");
  const [severity, setSeverity] = useState("");
  const [summary, setSummary] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [steps, setSteps] = useState<string[]>([]);

  async function handleAnalyze() {
    const response = await fetch("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ log }),
    });

    const data = await response.json();

    setSeverity(data.severity);
    setSummary(data.summary);
    setRootCause(data.rootCause);
    setRecommendation(data.recommendation);
    setSteps(data.steps || []);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "700px",
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
        }}
      >
        <Header />
        <LogInput log={log} setLog={setLog} />
        <AnalyzeButton onAnalyze={handleAnalyze} />
        <AnalysisPanel
          severity={severity}
          summary={summary}
          rootCause={rootCause}
          recommendation={recommendation}
          steps={steps}
        />
      </div>
    </main>
  );
}

export default Home;