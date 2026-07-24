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
  deletingId: number | null;
  hasActiveFilters: boolean;
  onDelete: (id: number) => Promise<void>;
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

function formatDate(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function HistoryList({
  history,
  loading,
  deletingId,
  hasActiveFilters,
  onDelete,
}: HistoryListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(
    null
  );

  const [confirmingId, setConfirmingId] = useState<
    number | null
  >(null);

  function toggleAnalysis(id: number) {
    setExpandedId((currentId) =>
      currentId === id ? null : id
    );

    setConfirmingId(null);
  }

  function beginDelete(id: number) {
    setConfirmingId(id);
  }

  function cancelDelete() {
    setConfirmingId(null);
  }

  async function confirmDelete(id: number) {
    await onDelete(id);

    if (expandedId === id) {
      setExpandedId(null);
    }

    setConfirmingId(null);
  }

  if (loading) {
    return (
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading analysis history...
      </div>
    );
  }

  if (history.length === 0 && hasActiveFilters) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-8 text-center">
        <p className="font-semibold text-slate-800">
          No analyses match your search
        </p>

        <p className="mt-2 text-sm text-slate-600">
          Try another keyword, select a different severity, or
          clear the filters.
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="font-semibold text-slate-700">
          No saved analyses yet
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Analyze a log and it will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4">
      {history.map((item) => {
        const isExpanded = expandedId === item.id;

        const isConfirmingDelete =
          confirmingId === item.id;

        const isDeleting = deletingId === item.id;

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
                    {formatDate(item.createdAt)}
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
                {isExpanded
                  ? "Hide details"
                  : "View full analysis"}
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
                      {item.rootCause ||
                        "No root cause available."}
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
                          <li
                            key={`${item.id}-step-${index}`}
                          >
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
                      {item.originalLog ||
                        "Original log unavailable."}
                    </pre>
                  </div>

                  <div className="border-t border-slate-200 pt-5">
                    {isConfirmingDelete ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="font-semibold text-red-800">
                          Delete this analysis?
                        </p>

                        <p className="mt-1 text-sm text-red-700">
                          This action cannot be undone.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={cancelDelete}
                            disabled={isDeleting}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void confirmDelete(item.id)
                            }
                            disabled={isDeleting}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleting
                              ? "Deleting..."
                              : "Yes, delete analysis"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          beginDelete(item.id)
                        }
                        disabled={deletingId !== null}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete analysis
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default HistoryList;