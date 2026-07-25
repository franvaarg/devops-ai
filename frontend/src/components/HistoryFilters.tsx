import type { FormEvent } from "react";

type HistoryFiltersProps = {
  search: string;
  severity: string;
  resultCount: number;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClear: () => void;
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />

      <path
        strokeLinecap="round"
        d="m16 16 4 4"
      />
    </svg>
  );
}

function FilterIcon() {
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
        d="M4 6h16M7 12h10m-7 6h4"
      />
    </svg>
  );
}

function HistoryFilters({
  search,
  severity,
  resultCount,
  loading,
  onSearchChange,
  onSeverityChange,
  onSearchSubmit,
  onClear,
}: HistoryFiltersProps) {
  const hasSearch = Boolean(search.trim());

  const hasFilters = Boolean(
    hasSearch || severity
  );

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    onSearchSubmit();
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
            <FilterIcon />
          </div>

          <div>
            <p className="font-bold text-slate-900 dark:text-white">
              Filter analyses
            </p>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Narrow the results by content or severity.
            </p>
          </div>
        </div>

        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:shadow-black/20">
          {loading
            ? "Searching..."
            : `${resultCount} ${
                resultCount === 1
                  ? "result"
                  : "results"
              }`}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 p-5 sm:grid-cols-[1fr_190px_auto] sm:p-6"
      >
        <div>
          <label
            htmlFor="history-search"
            className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            Search history
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <SearchIcon />
            </span>

            <input
              id="history-search"
              type="search"
              value={search}
              onChange={(event) =>
                onSearchChange(event.target.value)
              }
              placeholder="PostgreSQL, Docker, timeout..."
              className="w-full rounded-2xl border border-slate-300 bg-slate-50/50 py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-emerald-500 dark:focus:bg-slate-950 dark:focus:ring-emerald-900/50"
            />

            {hasSearch && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                title="Clear search"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-lg font-bold text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                ×
              </button>
            )}
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Results update automatically. Press Enter
            to search immediately.
          </p>
        </div>

        <div>
          <label
            htmlFor="severity-filter"
            className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            Severity
          </label>

          <select
            id="severity-filter"
            value={severity}
            onChange={(event) =>
              onSeverityChange(event.target.value)
            }
            className="w-full cursor-pointer rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition duration-200 hover:border-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-emerald-500 dark:focus:bg-slate-950 dark:focus:ring-emerald-900/50"
          >
            <option value="">
              All severities
            </option>

            <option value="Critical">
              Critical
            </option>

            <option value="High">
              High
            </option>

            <option value="Medium">
              Medium
            </option>

            <option value="Low">
              Low
            </option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onClear}
            disabled={!hasFilters}
            className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition duration-200 hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:ring-emerald-900/50 sm:w-auto"
          >
            Clear filters
          </button>
        </div>
      </form>

      <div className="flex min-h-16 flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/40 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/30 sm:px-6">
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {loading
            ? "Searching analyses..."
            : `Showing ${resultCount} ${
                resultCount === 1
                  ? "analysis"
                  : "analyses"
              }`}
        </span>

        {hasSearch && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 dark:border-teal-900/70 dark:bg-teal-950/50 dark:text-teal-300">
            Search:

            <span className="max-w-48 truncate">
              {search.trim()}
            </span>
          </span>
        )}

        {severity && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300">
            Severity: {severity}
          </span>
        )}

        {!hasFilters && !loading && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            No filters applied
          </span>
        )}
      </div>
    </div>
  );
}

export default HistoryFilters;