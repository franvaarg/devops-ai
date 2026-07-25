import { useState } from "react";

import type { HistoryItem } from "../services/api";
import { exportAnalysisToPdf } from "../utils/exportAnalysisPdf";

type HistoryListProps = {
  history: HistoryItem[];
  loading: boolean;
  deletingId: number | null;
  hasActiveFilters: boolean;
  onDelete: (id: number) => Promise<void>;
};

type IconProps = {
  className?: string;
};

function ChevronIcon({
  className = "h-5 w-5",
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6 9 6 6 6-6"
      />
    </svg>
  );
}

function DownloadIcon({
  className = "h-4 w-4",
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"
      />
    </svg>
  );
}

function TrashIcon({
  className = "h-4 w-4",
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16m-10 4v5m4-5v5M9 7l1-3h4l1 3m3 0-1 13H7L6 7"
      />
    </svg>
  );
}

function EmptyIcon({
  className = "h-7 w-7",
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 9h8m-8 4h5"
      />
    </svg>
  );
}

function getSeverityClasses(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return {
        badge:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300",
        accent: "bg-red-500",
      };

    case "high":
      return {
        badge:
          "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/50 dark:text-orange-300",
        accent: "bg-orange-500",
      };

    case "medium":
      return {
        badge:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/50 dark:text-amber-300",
        accent: "bg-amber-500",
      };

    case "low":
      return {
        badge:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300",
        accent: "bg-emerald-500",
      };

    default:
      return {
        badge:
          "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        accent: "bg-slate-400",
      };
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
  const [expandedId, setExpandedId] = useState<
    number | null
  >(null);

  const [confirmingId, setConfirmingId] =
    useState<number | null>(null);

  const [exportingId, setExportingId] =
    useState<number | null>(null);

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

  function handleExportPdf(item: HistoryItem) {
    try {
      setExportingId(item.id);
      exportAnalysisToPdf(item);
    } catch (error) {
      console.error("PDF export error:", error);

      window.alert(
        "The PDF could not be generated. Please try again."
      );
    } finally {
      setExportingId(null);
    }
  }

  if (loading) {
    return (
      <div className="mt-6 grid gap-4">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="h-7 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>

            <div className="mt-5 h-5 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="mt-5 h-4 w-28 animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0 && hasActiveFilters) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-teal-300 bg-teal-50/60 p-10 text-center dark:border-teal-900 dark:bg-teal-950/20">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm dark:bg-slate-900 dark:text-teal-300 dark:shadow-black/20">
          <EmptyIcon />
        </div>

        <p className="mt-5 font-black text-slate-800 dark:text-slate-100">
          No analyses match your search
        </p>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
          Try another keyword, select a different
          severity, or clear the active filters.
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
          <EmptyIcon />
        </div>

        <p className="mt-5 font-black text-slate-800 dark:text-slate-100">
          No saved analyses yet
        </p>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          Analyze your first log and the result will
          appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-5">
      {history.map((item) => {
        const isExpanded =
          expandedId === item.id;

        const isConfirmingDelete =
          confirmingId === item.id;

        const isDeleting =
          deletingId === item.id;

        const isExporting =
          exportingId === item.id;

        const severityClasses =
          getSeverityClasses(item.severity);

        return (
          <article
            key={item.id}
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:shadow-black/30"
          >
            <div
              className={`absolute inset-y-0 left-0 w-1 ${severityClasses.accent}`}
            />

            <button
              type="button"
              onClick={() =>
                toggleAnalysis(item.id)
              }
              aria-expanded={isExpanded}
              className="w-full p-5 pl-6 text-left sm:p-6 sm:pl-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${severityClasses.badge}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${severityClasses.accent}`}
                  />

                  {item.severity}
                </span>

                <div className="flex items-center gap-3">
                  <time className="text-xs font-semibold text-slate-500 dark:text-slate-400 sm:text-sm">
                    {formatDate(item.createdAt)}
                  </time>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition duration-300 group-hover:bg-emerald-50 group-hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-emerald-950/50 dark:group-hover:text-emerald-300">
                    <ChevronIcon
                      className={`h-5 w-5 transition-transform duration-300 ${
                        isExpanded
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </span>
                </div>
              </div>

              <p className="mt-5 line-clamp-3 text-base font-medium leading-7 text-slate-800 dark:text-slate-100">
                {item.summary}
              </p>

              <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {isExpanded
                  ? "Hide details"
                  : "View full analysis"}

                <span aria-hidden="true">→</span>
              </p>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40 sm:p-7">
                <div className="grid gap-5">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Root Cause
                    </h3>

                    <p className="mt-3 leading-7 text-slate-800 dark:text-slate-100">
                      {item.rootCause ||
                        "No root cause available."}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 dark:border-teal-900 dark:bg-teal-950/20">
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
                      Recommendation
                    </h3>

                    <p className="mt-3 leading-7 text-slate-800 dark:text-slate-100">
                      {item.recommendation ||
                        "No recommendation available."}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                      Suggested Steps
                    </h3>

                    {item.steps?.length > 0 ? (
                      <ol className="mt-4 grid gap-3">
                        {item.steps.map(
                          (step, index) => (
                            <li
                              key={`${item.id}-step-${index}`}
                              className="flex gap-3 text-slate-800 dark:text-slate-100"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                                {index + 1}
                              </span>

                              <span className="pt-0.5 leading-7">
                                {step}
                              </span>
                            </li>
                          )
                        )}
                      </ol>
                    ) : (
                      <p className="mt-3 text-slate-600 dark:text-slate-400">
                        No troubleshooting steps
                        available.
                      </p>
                    )}
                  </section>

                  <section>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Original Log
                      </h3>

                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Raw input
                      </span>
                    </div>

                    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-6 text-slate-200 shadow-inner">
                      {item.originalLog ||
                        "Original log unavailable."}
                    </pre>
                  </section>

                  <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
                    {isConfirmingDelete ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                            <TrashIcon />
                          </div>

                          <div>
                            <p className="font-black text-red-900 dark:text-red-200">
                              Delete this analysis?
                            </p>

                            <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300">
                              This action cannot be
                              undone.
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={cancelDelete}
                            disabled={isDeleting}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void confirmDelete(
                                item.id
                              )
                            }
                            disabled={isDeleting}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <TrashIcon />

                            {isDeleting
                              ? "Deleting..."
                              : "Yes, delete analysis"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleExportPdf(item)
                          }
                          disabled={
                            isExporting ||
                            deletingId !== null
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <DownloadIcon />

                          {isExporting
                            ? "Generating PDF..."
                            : "Export PDF"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            beginDelete(item.id)
                          }
                          disabled={
                            deletingId !== null ||
                            isExporting
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition duration-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          <TrashIcon />
                          Delete analysis
                        </button>
                      </div>
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