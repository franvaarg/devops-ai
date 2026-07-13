type AnalysisPanelProps = {
  severity: string;
  summary: string;
  rootCause: string;
  recommendation: string;
  steps: string[];
};

function getSeverityClasses(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700 ring-red-200";
    case "high":
      return "bg-orange-100 text-orange-700 ring-orange-200";
    case "medium":
      return "bg-amber-100 text-amber-700 ring-amber-200";
    case "low":
      return "bg-emerald-100 text-emerald-700 ring-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function AnalysisPanel({
  severity,
  summary,
  rootCause,
  recommendation,
  steps,
}: AnalysisPanelProps) {
  const hasAnalysis =
    severity || summary || rootCause || recommendation || steps.length > 0;

  if (!hasAnalysis) {
    return (
      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-xl font-bold text-slate-900">Latest Analysis</h2>
        <p className="mt-2 text-sm text-slate-500">
          Your next AI analysis will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-slate-950">Latest Analysis</h2>

        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${getSeverityClasses(
            severity
          )}`}
        >
          {severity || "Unknown"}
        </span>
      </div>

      <div className="mt-6 grid gap-5">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Summary
          </h3>
          <p className="mt-2 leading-7 text-slate-800">{summary}</p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Root Cause
          </h3>
          <p className="mt-2 leading-7 text-slate-800">{rootCause}</p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Recommendation
          </h3>
          <p className="mt-2 leading-7 text-slate-800">{recommendation}</p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Suggested Steps
          </h3>

          {steps.length > 0 ? (
            <ol className="mt-3 space-y-3">
              {steps.map((step, index) => (
                <li
                  key={`${step}-${index}`}
                  className="flex gap-3 rounded-xl bg-slate-50 p-4 text-slate-800"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {index + 1}
                  </span>
                  <span className="leading-7">{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No troubleshooting steps were returned.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AnalysisPanel;