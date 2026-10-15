import ProductFooter from "../components/ProductFooter";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import AccountPlan from "../components/AccountPlan";
import Header from "../components/Header";
import LogInput from "../components/LogInput";
import FileUpload from "../components/FileUpload";
import AnalyzeButton from "../components/AnalyzeButton";
import AnalysisPanel from "../components/AnalysisPanel";


import HistoryFilters from "../components/HistoryFilters";
import HistoryList from "../components/HistoryList";

import {
  trackEvent,
  logout,
  analyzeLog,
  ApiError,
  deleteAnalysis,
  getHistory,
  type HistoryItem,
  type AnalysisResult,
} from "../services/api";



type StoredUser = {
  name?: string;
  email?: string;
};

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v15H4V5Zm4-2v4m8-4v4M8 11h8m-8 4h5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4m5-3 4-4-4-4m4 4H9" />
    </svg>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isAuthenticationError(error: unknown) {
  if (error instanceof ApiError) return error.status === 401;
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  return [
    "unauthorized",
    "invalid token",
    "expired",
    "authentication",
    "401",
    "403",
  ].some((value) => message.includes(value));
}

function getStoredUser(): StoredUser {
  try {
    return JSON.parse(localStorage.getItem("user") ?? "{}") as StoredUser;
  } catch {
    localStorage.removeItem("user");
    return {};
  }
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function Home() {
  const [planRefresh, setPlanRefresh] = useState(0);
  const [decision, setDecision] = useState<Partial<AnalysisResult>>({});
  const [context, setContext] = useState("");
  const [log, setLog] = useState("");
  const analysisBusy = useRef(false);
  const historyGeneration = useRef(0);
  const analysisAttempt = useRef<{ log: string; key: string } | null>(null);
  const [severity, setSeverity] = useState("");
  const [summary, setSummary] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [rootCause, setRootCause] = useState("");
  const [confidence, setConfidence] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historySeverity, setHistorySeverity] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const user = getStoredUser();
  const displayName = user.name?.trim() || user.email?.split("@")[0] || "User";
  const userInitial = displayName.charAt(0).toUpperCase();
  const hasActiveFilters = Boolean(historySearch.trim() || historySeverity);

  function handleAuthError(error: unknown) {
    if (!isAuthenticationError(error)) return false;

    clearSession();
    toast.error("Your session has expired. Please sign in again.");
    window.setTimeout(() => window.location.reload(), 700);

    return true;
  }

  const loadHistory = useCallback(
    async (
      search = historySearch,
      severityFilter = historySeverity,
      showErrorToast = true
    ) => {
      const generation = ++historyGeneration.current;
      try {
        setIsHistoryLoading(true);

        const data = await getHistory({
          search: search.trim(),
          severity: severityFilter,
          limit: 50,
        });

        if (generation !== historyGeneration.current) return;
        setHistory(data);
        setHasMoreHistory(data.length === 50);
      } catch (error) {

        if (generation === historyGeneration.current && !handleAuthError(error) && showErrorToast) {
          toast.error(getErrorMessage(error, "Could not load the analysis history."));
        }
      } finally {
        if (generation === historyGeneration.current) setIsHistoryLoading(false);
      }
    },
    [historySearch, historySeverity]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHistory();
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [loadHistory]);

  async function handleAnalyze() {
    if (analysisBusy.current) return;
    if (!log.trim()) {
      toast.error("Paste or upload a log before analyzing.");
      return;
    }

    if (new TextEncoder().encode(log).length > 16384) { toast.error("Use an incident excerpt up to 16 KiB. Larger logs need a narrower time window."); return; }
    analysisBusy.current = true;
    const loadingToast = toast.loading("Assessing evidence and noise…");

    try {
      setIsAnalyzing(true);
      // Persist only a digest and request key, never raw logs/context. Reloads
      // after an ambiguous response loss must recover the original operation.
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ log, context }))))).map(byte => byte.toString(16).padStart(2, '0')).join('');
      let recovered: { digest?: string; key?: string } = {};
      try { const value = JSON.parse(sessionStorage.getItem('kanyi-analysis-attempt') || '{}'); if (value && typeof value === 'object') recovered = value; } catch { /* storage unavailable */ }
      if (analysisAttempt.current?.log !== JSON.stringify({ log, context })) {
        analysisAttempt.current = { log: JSON.stringify({ log, context }), key: recovered.digest === digest && typeof recovered.key === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(recovered.key) ? recovered.key : crypto.randomUUID() };
        try { sessionStorage.setItem('kanyi-analysis-attempt', JSON.stringify({ digest, key: analysisAttempt.current.key })); } catch { /* in-memory replay still works */ }
      }
      const data = await analyzeLog(log, analysisAttempt.current.key, context);
      setDecision(data);
      setPlanRefresh(n => n + 1);

      analysisAttempt.current = null;
      try { sessionStorage.removeItem('kanyi-analysis-attempt'); } catch { /* storage unavailable */ }

      setSeverity(data.severity ?? "");
      setSummary(data.summary ?? "");
      setEvidence(data.evidence ?? []);
      setRootCause(data.rootCause ?? "");
      setConfidence(data.confidence ?? "");
      setRecommendation(data.recommendation ?? "");
      setSteps(data.steps ?? []);

      await loadHistory(historySearch, historySeverity, false);
      toast.success("Log analyzed successfully.", { id: loadingToast });
    } catch (error) {
      if (error instanceof ApiError && ["AI_PROVIDER_ERROR", "AI_TIMEOUT", "AI_NETWORK", "AI_AUTH", "AI_PROVIDER_UNAVAILABLE", "AI_QUOTA_CONFIGURATION", "AI_RATE_LIMITED", "AI_REQUEST_REJECTED", "AI_INVALID_RESPONSE", "ANALYSIS_ATTEMPT_FAILED", "VALIDATION_ERROR", "QUOTA_EXCEEDED"].includes(error.code || "")) {
        analysisAttempt.current = null;
        try { sessionStorage.removeItem('kanyi-analysis-attempt'); } catch { /* storage unavailable */ }
      }
      if (error instanceof ApiError && error.code === "QUOTA_EXCEEDED") { setPlanRefresh(n => n + 1); trackEvent("quota_reached"); }

      if (handleAuthError(error)) {
        toast.dismiss(loadingToast);
        return;
      }

      toast.error(
        getErrorMessage(error, "Something went wrong during the analysis."),
        { id: loadingToast }
      );
    } finally {
      analysisBusy.current = false;
      setIsAnalyzing(false);
    }
  }

  function handleClearAnalysis() {
    analysisAttempt.current = null;
    try { sessionStorage.removeItem('kanyi-analysis-attempt'); } catch { /* storage unavailable */ }
    setDecision({});
    setContext("");
    setLog("");
    setSeverity("");
    setSummary("");
    setEvidence([]);
    setRootCause("");
    setConfidence("");
    setRecommendation("");
    setSteps([]);
  }

  async function handleDeleteAnalysis(id: number) {
    const loadingToast = toast.loading("Deleting analysis...");

    try {
      setDeletingId(id);
      await deleteAnalysis(id);
      setHistory((items) => items.filter((item) => item.id !== id));
      toast.success("Analysis deleted successfully.", { id: loadingToast });
    } catch (error) {

      if (handleAuthError(error)) {
        toast.dismiss(loadingToast);
        return;
      }

      toast.error(
        getErrorMessage(error, "Something went wrong while deleting the analysis."),
        { id: loadingToast }
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function loadOlderHistory() {
    const last = history[history.length - 1];
    if (!last || isHistoryLoading) return;
    const generation = ++historyGeneration.current;
    try {
      setIsHistoryLoading(true);
      const older = await getHistory({ search: historySearch.trim(), severity: historySeverity, beforeId: last.id, limit: 50 });
      if (generation !== historyGeneration.current) return;
      setHistory(current => [...current, ...older.filter(item => !current.some(saved => saved.id === item.id))]);
      setHasMoreHistory(older.length === 50);
    } catch (error) { if (!handleAuthError(error)) toast.error(getErrorMessage(error, "Older analyses could not be loaded.")); }
    finally { if (generation === historyGeneration.current) setIsHistoryLoading(false); }
  }

  async function handleLogout() {
    try {
      await logout();
      clearSession();
      toast.success('Signed out on all devices.');
      window.setTimeout(() => window.location.reload(), 400);
    } catch (error) {
      if (!handleAuthError(error)) toast.error('Sign out could not be confirmed. Retry when the service is available.');
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-8 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-10 lg:px-8">
      <div className="pointer-events-none absolute left-0 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-900/20" />
      <div className="pointer-events-none absolute right-0 top-72 h-96 w-96 translate-x-1/2 rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-900/20" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-black text-white">
              {userInitial}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                {displayName}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user.email || "Authenticated workspace"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>

        <AccountPlan refresh={planRefresh} />
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />

          <div className="p-6 sm:p-10">
            <Header />
            {history.length === 0 && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-slate-900">
              <h2 className="font-bold">Start with one incident window</h2>
              <p className="mt-1 text-sm">Try a safe sample, then replace it with your own log excerpt. Compare the legacy warning with the failing requests.</p>
              <button className="mt-3 rounded-lg border border-emerald-700 px-3 py-2 font-semibold" onClick={() => setLog('10:42 WARN legacy cache API deprecated\n10:43 ERROR database connection refused\n10:43 GET /orders 503\n10:44 GET /orders 503')}>Load safe example logs</button>
            </div>}
            <label htmlFor="operational-context" className="block text-sm font-bold">Operational context (optional)</label>
            <input id="operational-context" maxLength={1500} value={context} onChange={e => setContext(e.target.value)} placeholder="Environment, known legacy warnings, recent changes, expected behavior" className="mt-2 w-full rounded-xl border p-3 dark:bg-slate-950" />
            <p className="mt-2 text-xs">Context helps distinguish expected behavior from incidents. It is user-provided, not observed log evidence.</p>
            <LogInput log={log} setLog={setLog} />
            <FileUpload onFileLoaded={setLog} />
            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Logs are sent to Google Gemini for analysis. KANYI attempts to redact common credentials
              before analysis and storage, but detection is not complete. Remove sensitive data before submitting.
            </p>
            <AnalyzeButton
              onAnalyze={handleAnalyze}
              onClear={handleClearAnalysis}
              isLoading={isAnalyzing}
            />
            <AnalysisPanel
              {...decision}
              severity={severity}
              summary={summary}
              evidence={evidence}
              rootCause={rootCause}
              confidence={confidence}
              recommendation={recommendation}
              steps={steps}
            />
          </div>
        </section>

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
                Search, filter, inspect, export, and manage your analyzed logs.
              </p>
            </div>
          </div>

          <HistoryFilters
            search={historySearch}
            severity={historySeverity}
            resultCount={history.length}
            loading={isHistoryLoading}
            onSearchChange={setHistorySearch}
            onSeverityChange={setHistorySeverity}
            onSearchSubmit={() => void loadHistory()}
            onClear={() => {
              setHistorySearch("");
              setHistorySeverity("");
            }}
          />

          <HistoryList
            history={history}
            loading={isHistoryLoading}
            deletingId={deletingId}
            hasActiveFilters={hasActiveFilters}
            onDelete={handleDeleteAnalysis}
          />
          {hasMoreHistory && <button className="mt-5 rounded-xl border px-4 py-2 font-semibold" disabled={isHistoryLoading} onClick={() => void loadOlderHistory()}>Load older analyses</button>}
        </section>
        <ProductFooter />
      </div>
    </main>
  );
}

export default Home;
