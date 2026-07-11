import { useCallback, useEffect, useState } from "react";

import Header from "../components/Header";
import LogInput from "../components/LogInput";
import FileUpload from "../components/FileUpload";
import AnalyzeButton from "../components/AnalyzeButton";
import AnalysisPanel from "../components/AnalysisPanel";
import HistoryList from "../components/HistoryList";

type HistoryItem = {
  id: number;
  severity: string;
  summary: string;
  rootCause: string;
  recommendation: string;
  steps: string[];
  originalLog: string;
  createdAt: string;
};

function Home() {
  const [log, setLog] = useState("");
  const [severity, setSeverity] = useState("");
  const [summary, setSummary] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [steps, setSteps] = useState<string[]>([]);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setIsHistoryLoading(true);

      const response = await fetch("http://localhost:3000/api/history");

      if (!response.ok) {
        throw new Error("Could not load the analysis history.");
      }

      const data: HistoryItem[] = await response.json();
      setHistory(data);
    } catch (error) {
      console.error("History loading error:", error);
      setErrorMessage("Could not load the analysis history.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function handleAnalyze() {
    if (!log.trim()) {
      setErrorMessage("Paste or upload a log before analyzing.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage("");

      const response = await fetch("http://localhost:3000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ log }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.summary ||
            "The analysis could not be completed."
        );
      }

      setSeverity(data.severity ?? "");
      setSummary(data.summary ?? "");
      setRootCause(data.rootCause ?? "");
      setRecommendation(data.recommendation ?? "");
      setSteps(data.steps ?? []);

      await loadHistory();
    } catch (error) {
      console.error("Analysis error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong during the analysis."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-10">
          <Header />

          <LogInput log={log} setLog={setLog} />

          <FileUpload onFileLoaded={setLog} />

          <AnalyzeButton
            onAnalyze={handleAnalyze}
            isLoading={isAnalyzing}
          />

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}

          <AnalysisPanel
            severity={severity}
            summary={summary}
            rootCause={rootCause}
            recommendation={recommendation}
            steps={steps}
          />
        </section>

        <HistoryList
          history={history}
          loading={isHistoryLoading}
        />
      </div>
    </main>
  );
}

export default Home;