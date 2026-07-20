import { useState } from "react";

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

type HistoryListProps = {
  history: HistoryItem[];
  loading: boolean;
};

function getSeverityClasses(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700";
    case "high":
      return "bg-orange-100 text-orange-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    case "low":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function HistoryList({ history, loading }: HistoryListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function toggleAnalysis(id: number) {
    setExpandedId((currentId) => (currentId === id ? null : id));
  }

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Saved results
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            Analysis History
          </h2>
        </div>

        {!loading && history.length > 0 && (
          <span className="text-sm text-slate-500">
            {history.length} saved
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading history...
        </div>
      ) : history.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-semibold text-slate-700">
            No saved analyses yet
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Analyze a log and it will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {history.map((item) => {
            const isExpanded = expandedId === item.id;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => toggleAnalysis(item.id)}
                  aria-expanded={isExpanded}
                  className="w-full p-5 text-left"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${getSeverityClasses(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>

                    <div className="flex items-center gap-3">
                      <time className="text-sm text-slate-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </time>

                      <span className="text-lg font-bold text-slate-500">
                        {isExpanded ? "−" : "+"}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 leading-7 text-slate-800">
                    {item.summary}
                  </p>

                  <p className="mt-3 text-sm font-semibold text-blue-600">
                    {isExpanded ? "Hide details" : "View full analysis"}
                  </p>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-5">
                    <div className="grid gap-6">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                          Root Cause
                        </h3>

                        <p className="mt-2 leading-7 text-slate-800">
                          {item.rootCause || "No root cause available."}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                          Recommendation
                        </h3>

                        <p className="mt-2 leading-7 text-slate-800">
                          {item.recommendation ||
                            "No recommendation available."}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                          Suggested Steps
                        </h3>

                        {item.steps?.length > 0 ? (
                          <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-800">
                            {item.steps.map((step, index) => (
                              <li key={`${item.id}-step-${index}`}>
                                {step}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="mt-2 text-slate-600">
                            No troubleshooting steps available.
                          </p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                          Original Log
                        </h3>

                        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-200">
                          {item.originalLog || "Original log unavailable."}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default HistoryList;