type HistoryFiltersProps = {
  search: string;
  severity: string;
  onSearchChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onClear: () => void;
};

function HistoryFilters({
  search,
  severity,
  onSearchChange,
  onSeverityChange,
  onClear,
}: HistoryFiltersProps) {
  const hasFilters = Boolean(search.trim() || severity);

  return (
    <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px_auto]">
      <div>
        <label
          htmlFor="history-search"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Search history
        </label>

        <input
          id="history-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search PostgreSQL, Docker, timeout..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div>
        <label
          htmlFor="severity-filter"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Severity
        </label>

        <select
          id="severity-filter"
          value={severity}
          onChange={(event) => onSeverityChange(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">All severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="flex items-end">
        <button
          type="button"
          onClick={onClear}
          disabled={!hasFilters}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export default HistoryFilters;