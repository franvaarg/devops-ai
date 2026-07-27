import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";

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

import type { SeverityName } from "../components/dashboard/dashboardUtils";

type StoredUser = {
  id?: number;
  name?: string;
  email?: string;
};

function HistoryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 5h16v15H4V5Zm4-2v4m8-4v4M8 11h8m-8 4h5"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15 16 4-4-4-4"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 12H9"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 21a8 8 0 0 1 16 0"
      />
    </svg>
  );
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string
) {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

function getStoredUser(): StoredUser | null {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as StoredUser;
  } catch {
    localStorage.removeItem("user");

    return null;
  }
}

function isAuthenticationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("unauthorized") ||
    message.includes("invalid token") ||
    message.includes("expired") ||
    message.includes("authentication") ||
    message.includes("401") ||
    message.includes("403")
  );
}

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

  const user = useMemo(() => getStoredUser(), []);

  const displayName =
    user?.name?.trim() ||
    user?.email?.split("@")[0] ||
    "User";

  const userInitial =
    displayName.charAt(0).toUpperCase() || "U";

  const hasActiveFilters = Boolean(
    historySearch.trim() || historySeverity
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  const redirectToLogin = useCallback(() => {
    clearSession();
    window.location.reload();
  }, [clearSession]);

  const handleRequestError = useCallback(
    (
      error: unknown,
      fallbackMessage: string,
      showToast = true
    ) => {
      if (isAuthenticationError(error)) {
        clearSession();

        toast.error(
          "Your session has expired. Please sign in again."
        );

        window.setTimeout(() => {
          window.location.reload();
        }, 700);

        return;
      }

      if (showToast) {
        toast.error(
          getErrorMessage(error, fallbackMessage)
        );
      }
    },
    [clearSession]
  );

  const loadHistory = useCallback(
    async (
      search = historySearch,
      severityFilter = historySeverity,
      showErrorToast = true
    ) => {
      try {
        setIsHistoryLoading(true);

        const data = await getHistory({
          search: search.trim(),
          severity: severityFilter,
          limit: 50,
        });

        setHistory(data);
      } catch (error) {
        console.error(
          "History loading error:",
          error
        );

        handleRequestError(
          error,
          "Could not load the analysis history.",
          showErrorToast
        );
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [
      historySearch,
      historySeverity,
      handleRequestError,
    ]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHistory(
        historySearch,
        historySeverity,
        true
      );
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    historySearch,
    historySeverity,
    loadHistory,
  ]);

  async function handleAnalyze() {
    const normalizedLog = log.trim();

    if (!normalizedLog) {
      toast.error(
        "Paste or upload a log before analyzing."
      );

      return;
    }

    const loadingToast = toast.loading(
      "Analyzing log..."
    );

    try {
      setIsAnalyzing(true);

      const data = await analyzeLog(normalizedLog);

      setSeverity(data.severity ?? "");
      setSummary(data.summary ?? "");
      setRootCause(data.rootCause ?? "");
      setRecommendation(
        data.recommendation ?? ""
      );
      setSteps(data.steps ?? []);

      await loadHistory(
        historySearch,
        historySeverity,
        false
      );

      toast.success(
        "Log analyzed successfully.",
        {
          id: loadingToast,
        }
      );
    } catch (error) {
      console.error("Analysis error:", error);

      if (isAuthenticationError(error)) {
        toast.dismiss(loadingToast);

        handleRequestError(
          error,
          "Your session has expired."
        );

        return;
      }

      toast.error(
        getErrorMessage(
          error,
          "Something went wrong during the analysis."
        ),
        {
          id: loadingToast,
        }
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleDeleteAnalysis(id: number) {
    const loadingToast = toast.loading(
      "Deleting analysis..."
    );

    try {
      setDeletingId(id);

      await deleteAnalysis(id);

      setHistory((currentHistory) =>
        currentHistory.filter(
          (item) => item.id !== id
        )
      );

      toast.success(
        "Analysis deleted successfully.",
        {
          id: loadingToast,
        }
      );
    } catch (error) {
      console.error(
        "Delete analysis error:",
        error
      );

      if (isAuthenticationError(error)) {
        toast.dismiss(loadingToast);

        handleRequestError(
          error,
          "Your session has expired."
        );

        return;
      }

      toast.error(
        getErrorMessage(
          error,
          "Something went wrong while deleting the analysis."
        ),
        {
          id: loadingToast,
        }
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleDashboardSeverityClick(
    selectedSeverity: SeverityName
  ) {
    setHistorySeverity((currentSeverity) =>
      currentSeverity.toLowerCase() ===
      selectedSeverity.toLowerCase()
        ? ""
        : selectedSeverity
    );
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

  function handleLogout() {
    clearSession();

    toast.success("Signed out successfully.");

    window.setTimeout(() => {
      window.location.reload();
    }, 400);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-10 lg:px-8">
      <div
        className="pointer-events-none absolute left-0 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-900/20"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute right-0 top-72 h-96 w-96 translate-x-1/2 rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-900/20"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-lg shadow-slate-200/40 backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-black text-white shadow-lg shadow-emerald-600/20">
              {userInitial}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400">
                  <UserIcon />
                </span>

                <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                  {displayName}
                </p>
              </div>

              <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                {user?.email ||
                  "Authenticated workspace"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />

          <div className="p-6 sm:p-10">
            <Header />

            <LogInput
              log={log}
              setLog={setLog}
            />

            <FileUpload
              onFileLoaded={setLog}
            />

            <AnalyzeButton
              onAnalyze={handleAnalyze}
              isLoading={isAnalyzing}
            />

            <AnalysisPanel
              severity={severity}
              summary={summary}
              rootCause={rootCause}
              recommendation={recommendation}
              steps={steps}
            />
          </div>
        </section>

        <DashboardStats
          history={history}
          loading={isHistoryLoading}
          selectedSeverity={historySeverity}
          onSeverityClick={
            handleDashboardSeverityClick
          }
        />

        <SeverityChart
          history={history}
          loading={isHistoryLoading}
        />

        <section className="mt-12 pb-12">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <HistoryIcon />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                Saved results
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Analysis History
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Search, filter, inspect, export,
                and manage your previously analyzed
                logs.
              </p>
            </div>
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