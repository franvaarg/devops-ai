import { useState } from "react";
import AnalysisPanel from "./AnalysisPanel";
import { StatusBadge } from "./ui/Workspace";

import type { HistoryItem } from "../services/api";


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

  async function handleExportPdf(item: HistoryItem) {
    try {
      setExportingId(item.id);
      const { exportAnalysisToPdf } = await import("../utils/exportAnalysisPdf");
      exportAnalysisToPdf(item);
    } catch {

      window.alert(
        "The PDF could not be generated. Please try again."
      );
    } finally {
      setExportingId(null);
    }
  }

  if (loading) {
    return (
      <div className="mt-6 grid gap-4" role="status" aria-label="Loading analysis history">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20"
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
      <div className="mt-6 rounded-lg border border-dashed border-teal-300 bg-teal-50/60 p-10 text-center dark:border-teal-900 dark:bg-teal-950/20">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-white text-teal-600 dark:bg-slate-900 dark:text-teal-300 dark:shadow-black/20">
          <EmptyIcon />
        </div>

        <p className="mt-5 font-semibold text-slate-800 dark:text-slate-100">
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
      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
          <EmptyIcon />
        </div>

        <p className="mt-5 font-semibold text-slate-800 dark:text-slate-100">
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
    <div className="history-list mt-5 grid gap-2">
      {history.map((item) => {
        const isExpanded =
          expandedId === item.id;

        const isConfirmingDelete =
          confirmingId === item.id;

        const isDeleting =
          deletingId === item.id;

        const isExporting =
          exportingId === item.id;


        return (
          <article
            key={item.id}
            className="history-row group relative overflow-hidden rounded-lg border border-slate-200 bg-white transition duration-300 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:shadow-black/30"
          >
            <button
              type="button"
              onClick={() =>
                toggleAnalysis(item.id)
              }
              aria-expanded={isExpanded}
              className="history-row-toggle w-full text-left" aria-controls={isExpanded ? `saved-analysis-${item.id}` : undefined}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <StatusBadge value={item.severity} />
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

              <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-slate-800 dark:text-slate-100">
                {item.summary}
              </p>

              <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {isExpanded
                  ? "Hide details"
                  : "View full analysis"}

                <span aria-hidden="true">→</span>
              </p>
            </button>

            {isExpanded && (
              <div id={`saved-analysis-${item.id}`} className="history-details border-t border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40 sm:p-7">
                <div className="grid gap-5 break-words [overflow-wrap:anywhere]">
                  <AnalysisPanel {...item} />

                  <section>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Stored log excerpt
                      </h3>

                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Stored input
                      </span>
                    </div>

                    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-800 bg-slate-950 p-5 text-sm leading-6 text-slate-200">
                      {item.originalLog ||
                        "Original log unavailable."}
                    </pre>
                  </section>

                  <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
                    {isConfirmingDelete ? (
                      <div className="rounded-md border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                            <TrashIcon />
                          </div>

                          <div>
                            <p className="font-semibold text-red-900 dark:text-red-200">
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
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition duration-200 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
