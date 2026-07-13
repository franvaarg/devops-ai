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
          {history.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${getSeverityClasses(
                    item.severity
                  )}`}
                >
                  {item.severity}
                </span>

                <time className="text-sm text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </time>
              </div>

              <p className="mt-4 leading-7 text-slate-800">
                {item.summary}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default HistoryList;