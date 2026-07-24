import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Header from "../components/Header";
import LogInput from "../components/LogInput";
import FileUpload from "../components/FileUpload";
import AnalyzeButton from "../components/AnalyzeButton";
import AnalysisPanel from "../components/AnalysisPanel";
import DashboardStats from "../components/DashboardStats";
import SeverityChart from "../components/SeverityChart";
import HistoryFilters from "../components/HistoryFilters";
import HistoryList from "../components/HistoryList";

import {
  analyzeLog,
  deleteAnalysis,
  getHistory,
  type HistoryItem,
} from "../services/api";

function Home() {
  const [log, setLog] = useState("");

  const [severity, setSeverity] = useState("");
  const [summary, setSummary] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [recommendation, setRecommendation] =
    useState("");
  const [steps, setSteps] = useState<string[]>([]);

  const [history, setHistory] = useState<
    HistoryItem[]
  >([]);

  const [historySearch, setHistorySearch] =
    useState("");

  const [historySeverity, setHistorySeverity] =
    useState("");

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [isHistoryLoading, setIsHistoryLoading] =
    useState(true);

  const [deletingId, setDeletingId] = useState<
    number | null
  >(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const hasActiveFilters = Boolean(
    historySearch.trim() || historySeverity
  );

  const loadHistory = useCallback(
    async (
      search = historySearch,
      severityFilter = historySeverity
    ) => {
      try {
        setIsHistoryLoading(true);

        const data = await getHistory({
          search,
          severity: severityFilter,
          limit: 50,
        });

        setHistory(data);
      } catch (error) {
        console.error(
          "History loading error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load the analysis history."
        );
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
      setErrorMessage(
        "Paste or upload a log before analyzing."
      );

      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage("");

      const data = await analyzeLog(log);

      setSeverity(data.severity ?? "");
      setSummary(data.summary ?? "");
      setRootCause(data.rootCause ?? "");
      setRecommendation(
        data.recommendation ?? ""
      );
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

  async function handleDeleteAnalysis(id: number) {
    try {
      setDeletingId(id);
      setErrorMessage("");

      await deleteAnalysis(id);

      setHistory((currentHistory) =>
        currentHistory.filter(
          (item) => item.id !== id
        )
      );
    } catch (error) {
      console.error(
        "Delete analysis error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while deleting the analysis."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleSearchSubmit() {
    void loadHistory(
      historySearch,
      historySeverity
    );
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

          <LogInput
            log={log}
            setLog={setLog}
          />

          <FileUpload onFileLoaded={setLog} />

          <AnalyzeButton
            onAnalyze={handleAnalyze}
            isLoading={isAnalyzing}
          />

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <strong>Error:</strong>{" "}
              {errorMessage}
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
              Analysis History
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Search, filter, inspect, and manage
              previously analyzed logs.
            </p>
          </div>

          <HistoryFilters
            search={historySearch}
            severity={historySeverity}
            resultCount={history.length}
            loading={isHistoryLoading}
            onSearchChange={setHistorySearch}
            onSeverityChange={
              setHistorySeverity
            }
            onSearchSubmit={
              handleSearchSubmit
            }
            onClear={handleClearFilters}
          />

          <HistoryList
            history={history}
            loading={isHistoryLoading}
            deletingId={deletingId}
            hasActiveFilters={
              hasActiveFilters
            }
            onDelete={
              handleDeleteAnalysis
            }
          />
        </section>
      </div>
    </main>
  );
}

export default Home;