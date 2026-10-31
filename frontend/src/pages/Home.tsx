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
        d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4m5-3 4-4-4-4m4 4H9"
      />
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
  const [activeSection, setActiveSection] = useState(
    () => window.location.hash.slice(1) || "workspace",
  );
  useEffect(() => {
    const syncSection = () =>
      setActiveSection(window.location.hash.slice(1) || "workspace");
    window.addEventListener("hashchange", syncSection);
    return () => window.removeEventListener("hashchange", syncSection);
  }, []);
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
      showErrorToast = true,
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
        if (
          generation === historyGeneration.current &&
          !handleAuthError(error) &&
          showErrorToast
        ) {
          toast.error(
            getErrorMessage(error, "Could not load the analysis history."),
          );
        }
      } finally {
        if (generation === historyGeneration.current)
          setIsHistoryLoading(false);
      }
    },
    [historySearch, historySeverity],
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

    if (new TextEncoder().encode(log).length > 16384) {
      toast.error(
        "Use an incident excerpt up to 16 KiB. Larger logs need a narrower time window.",
      );
      return;
    }
    analysisBusy.current = true;
    const loadingToast = toast.loading("Assessing evidence and noise…");

    try {
      setIsAnalyzing(true);
      // Persist only a digest and request key, never raw logs/context. Reloads
      // after an ambiguous response loss must recover the original operation.
      const digest = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(JSON.stringify({ log, context })),
          ),
        ),
      )
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      let recovered: { digest?: string; key?: string } = {};
      try {
        const value = JSON.parse(
          sessionStorage.getItem("kanyi-analysis-attempt") || "{}",
        );
        if (value && typeof value === "object") recovered = value;
      } catch {
        /* storage unavailable */
      }
      if (analysisAttempt.current?.log !== JSON.stringify({ log, context })) {
        analysisAttempt.current = {
          log: JSON.stringify({ log, context }),
          key:
            recovered.digest === digest &&
            typeof recovered.key === "string" &&
            /^[A-Za-z0-9_-]{16,128}$/.test(recovered.key)
              ? recovered.key
              : crypto.randomUUID(),
        };
        try {
          sessionStorage.setItem(
            "kanyi-analysis-attempt",
            JSON.stringify({ digest, key: analysisAttempt.current.key }),
          );
        } catch {
          /* in-memory replay still works */
        }
      }
      const data = await analyzeLog(log, analysisAttempt.current.key, context);
      setDecision(data);
      setPlanRefresh((n) => n + 1);

      analysisAttempt.current = null;
      try {
        sessionStorage.removeItem("kanyi-analysis-attempt");
      } catch {
        /* storage unavailable */
      }

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
      if (
        error instanceof ApiError &&
        [
          "AI_PROVIDER_ERROR",
          "AI_TIMEOUT",
          "AI_NETWORK",
          "AI_AUTH",
          "AI_PROVIDER_UNAVAILABLE",
          "AI_QUOTA_CONFIGURATION",
          "AI_RATE_LIMITED",
          "AI_REQUEST_REJECTED",
          "AI_INVALID_RESPONSE",
          "ANALYSIS_ATTEMPT_FAILED",
          "VALIDATION_ERROR",
          "QUOTA_EXCEEDED",
        ].includes(error.code || "")
      ) {
        analysisAttempt.current = null;
        try {
          sessionStorage.removeItem("kanyi-analysis-attempt");
        } catch {
          /* storage unavailable */
        }
      }
      if (error instanceof ApiError && error.code === "QUOTA_EXCEEDED") {
        setPlanRefresh((n) => n + 1);
        trackEvent("quota_reached");
      }

      if (handleAuthError(error)) {
        toast.dismiss(loadingToast);
        return;
      }

      toast.error(
        getErrorMessage(error, "Something went wrong during the analysis."),
        { id: loadingToast },
      );
    } finally {
      analysisBusy.current = false;
      setIsAnalyzing(false);
    }
  }

  function handleClearAnalysis() {
    analysisAttempt.current = null;
    try {
      sessionStorage.removeItem("kanyi-analysis-attempt");
    } catch {
      /* storage unavailable */
    }
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
        getErrorMessage(
          error,
          "Something went wrong while deleting the analysis.",
        ),
        { id: loadingToast },
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
      const older = await getHistory({
        search: historySearch.trim(),
        severity: historySeverity,
        beforeId: last.id,
        limit: 50,
      });
      if (generation !== historyGeneration.current) return;
      setHistory((current) => [
        ...current,
        ...older.filter(
          (item) => !current.some((saved) => saved.id === item.id),
        ),
      ]);
      setHasMoreHistory(older.length === 50);
    } catch (error) {
      if (!handleAuthError(error))
        toast.error(
          getErrorMessage(error, "Older analyses could not be loaded."),
        );
    } finally {
      if (generation === historyGeneration.current) setIsHistoryLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      clearSession();
      toast.success("Signed out on all devices.");
      window.setTimeout(() => window.location.reload(), 400);
    } catch (error) {
      if (!handleAuthError(error))
        toast.error(
          "Sign out could not be confirmed. Retry when the service is available.",
        );
    }
  }

  return (
    <main className="product-shell">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <div className="app-topbar">
        <a href="#workspace" className="app-brand">
          <span>K</span>KANYI
          <span className="app-product-label">INCIDENT WORKSPACE</span>
        </a>
        <div className="app-user">
          <span className="user-avatar">{userInitial}</span>
          <div>
            <strong>{displayName}</strong>
            <small>{user.email || "Authenticated workspace"}</small>
          </div>
          <button type="button" onClick={() => void handleLogout()}>
            <LogoutIcon />
            Sign out
          </button>
        </div>
      </div>
      <div className="app-layout">
        <nav className="app-rail" aria-label="Workspace navigation">
          <p className="section-kicker">Workspace</p>
          <a
            href="#workspace"
            aria-current={
              activeSection === "workspace" ? "location" : undefined
            }
          >
            <span className="rail-index">01</span>
            <span>Investigate</span>
          </a>
          <a
            href="#history"
            aria-current={activeSection === "history" ? "location" : undefined}
          >
            <span className="rail-index">02</span>
            <span>Analysis history</span>
          </a>
          <a
            href="#account"
            aria-current={activeSection === "account" ? "location" : undefined}
          >
            <span className="rail-index">03</span>
            <span>Account & usage</span>
          </a>
          <div className="rail-note">
            Evidence-driven triage.
            <br />
            Human judgment required.
          </div>
        </nav>
        <div className="app-content">
          <Header />
          <section
            id="workspace"
            tabIndex={-1}
            aria-label="Incident workspace"
            className="workspace-layout"
          >
            <div className="workspace-input">
              <div className="workspace-bar">
                <span>01 / Incident input</span>
                <span>16 KiB MAX</span>
              </div>
              <div className="workspace-input-body">
                {history.length === 0 && (
                  <div className="onboarding-note">
                    <h2>Start with one incident window</h2>
                    <p>
                      Try a safe sample, then replace it with your own log
                      excerpt. Compare the legacy warning with the failing
                      requests.
                    </p>
                    <button
                      onClick={() =>
                        setLog(
                          "10:42 WARN legacy cache API deprecated\n10:43 ERROR database connection refused\n10:43 GET /orders 503\n10:44 GET /orders 503",
                        )
                      }
                    >
                      Load safe example logs
                    </button>
                  </div>
                )}
                <LogInput log={log} setLog={setLog} />
                <FileUpload onFileLoaded={setLog} />
                <div className="context-field">
                  <label htmlFor="operational-context">
                    Operational context (optional)
                  </label>
                  <input
                    id="operational-context"
                    maxLength={1500}
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Environment, recent changes, expected behavior"
                  />
                  <p>
                    Context helps distinguish expected behavior from incidents.
                    It is user-provided, not observed log evidence.
                  </p>
                </div>
                <p className="data-notice">
                  Logs are sent to Google Gemini for analysis. KANYI attempts to
                  redact common credentials before analysis and storage, but
                  detection is not complete. Remove sensitive data before
                  submitting.
                </p>
                <AnalyzeButton
                  onAnalyze={handleAnalyze}
                  onClear={handleClearAnalysis}
                  isLoading={isAnalyzing}
                />
              </div>
            </div>
            <div className="workspace-output" aria-busy={isAnalyzing}>
              {isAnalyzing && (
                <p role="status" className="analysis-progress">
                  Assessing evidence and noise… Your previous result remains
                  available below.
                </p>
              )}
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
          <section id="history" className="history-workspace">
            <div className="section-title">
              <HistoryIcon />
              <div>
                <p className="section-kicker">Investigation archive</p>
                <h2>Analysis History</h2>
                <p>
                  Search, filter, inspect, export, and manage your analyzed
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
            {hasMoreHistory && (
              <button
                className="mt-5 rounded-xl border px-4 py-2 font-semibold"
                disabled={isHistoryLoading}
                onClick={() => void loadOlderHistory()}
              >
                Load older analyses
              </button>
            )}
          </section>
          <section id="account" className="account-workspace">
            <div className="section-title">
              <div>
                <p className="section-kicker">Account / resource limits</p>
                <h2>Account & usage</h2>
                <p>
                  Monitor your allowance and manage your subscription and
                  account.
                </p>
              </div>
            </div>
            <AccountPlan refresh={planRefresh} />
          </section>
          <ProductFooter />
        </div>
      </div>
    </main>
  );
}

export default Home;
