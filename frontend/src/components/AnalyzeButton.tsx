type AnalyzeButtonProps = {
  onAnalyze: () => void;
  onClear: () => void;
  isLoading: boolean;
  label?: string;
};

function AnalyzeButton({
  onAnalyze,
  onClear,
  isLoading,
  label = "Assess incident",
}: AnalyzeButtonProps) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <button
        type="button"
        onClick={onAnalyze}
        disabled={isLoading}
        className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 disabled:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:focus-visible:ring-emerald-800 sm:w-auto"
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Analyzing log...
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4 transition-transform duration-300"
              aria-hidden="true"
            >
              <path d="m5 12 14 0m-6-6 6 6-6 6" />
            </svg>

            {label}
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onClear}
        disabled={isLoading}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:focus-visible:ring-slate-700 sm:w-auto"
      >
        Clear
      </button>
    </div>
  );
}

export default AnalyzeButton;
