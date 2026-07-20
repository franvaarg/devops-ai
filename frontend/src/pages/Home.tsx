import { useCallback, useEffect, useState } from "react";

import Header from "../components/Header";
import LogInput from "../components/LogInput";
import FileUpload from "../components/FileUpload";
import AnalyzeButton from "../components/AnalyzeButton";
import AnalysisPanel from "../components/AnalysisPanel";
import DashboardStats from "../components/DashboardStats";
import SeverityChart from "../components/SeverityChart";
import HistoryFilters from "../components/HistoryFilters";
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
  const [historySearch, setHistorySearch] = useState("");
  const [historySeverity, setHistorySeverity] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadHistory = useCallback(
    async (search = historySearch, severityFilter = historySeverity) => {
      try {
        setIsHistoryLoading(true);

        const query = new URLSearchParams();

        if (search.trim()) {
          query.set("search", search.trim());
        }

        if (severityFilter) {
          query.set("severity", severityFilter);
        }

        query.set("limit", "50");

        const response = await fetch(
          `http://localhost:3000/api/history?${query.toString()}`
        );

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
    },
    [historySearch, historySeverity]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHistory();
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
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

  function handleClearFilters() {
    setHistorySearch("");
    setHistorySeverity("");
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

        <DashboardStats
          history={history}
          loading={isHistoryLoading}
        />

        <SeverityChart
          history={history}
          loading={isHistoryLoading}
        />

        <section className="mt-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Saved results
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              Search Analysis History
            </h2>
          </div>

          <HistoryFilters
            search={historySearch}
            severity={historySeverity}
            onSearchChange={setHistorySearch}
            onSeverityChange={setHistorySeverity}
            onClear={handleClearFilters}
          />

          <HistoryList
            history={history}
            loading={isHistoryLoading}
          />
        </section>
      </div>
    </main>
  );
}

export default Home;