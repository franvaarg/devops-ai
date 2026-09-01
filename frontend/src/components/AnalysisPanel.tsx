import type { ReactNode } from "react";

type AnalysisPanelProps = {
  severity: string;
  summary: string;
  evidence: string[];
  rootCause: string;
  confidence: string;
  recommendation: string;
  steps: string[];
};

function getSeverityClasses(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700 ring-red-200 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/70";

    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700 ring-orange-200 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/70";

    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700 ring-amber-200 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/70";

    case "low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/70";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700 ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  }
}

function AnalysisSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/50">
      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
        {title}
      </h3>

      <div className="mt-3 leading-7 text-slate-700 dark:text-slate-300">
        {children}
      </div>
    </div>
  );
}

function AnalysisPanel({
  severity,
  summary,
  evidence,
  rootCause,
  confidence,
  recommendation,
  steps,
}: AnalysisPanelProps) {
  const hasAnalysis = Boolean(
    severity ||
      summary ||
      evidence.length > 0 ||
      rootCause ||
      confidence ||
      recommendation ||
      steps.length > 0
  );

  if (!hasAnalysis) {
    return (
      <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M9.5 3h5l.7 2.1 2 .8 2-1 2.5 4.3-1.8 1.4.1 2.2 1.7 1.5-2.5 4.3-2.1-.9-1.9 1.1-.3 2.2h-5l-.4-2.2-1.9-1.1-2.1.9L3 14.3l1.7-1.5.1-2.2L3 9.2 5.5 4.9l2 1 2-.8L9.5 3Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            Latest Analysis
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Your next AI-generated diagnosis will appear
            here after you analyze a log.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-5 dark:border-slate-800 dark:from-emerald-950/50 dark:to-teal-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
              AI diagnosis
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
              Latest Analysis
            </h2>
          </div>

          <span
            className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide ring-1 ring-inset ${getSeverityClasses(
              severity
            )}`}
          >
            {severity || "Unknown"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-6">
        <AnalysisSection title="Summary">
          <p>{summary || "No summary available."}</p>
        </AnalysisSection>

        <AnalysisSection title="Observed Evidence">
          {evidence.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5">
              {evidence.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No supporting evidence was identified.</p>
          )}
        </AnalysisSection>

        <AnalysisSection title={`Likely Root Cause · ${confidence || "Low"} confidence`}>
          <p>{rootCause || "No root cause available."}</p>
        </AnalysisSection>

        <AnalysisSection title="Recommendation">
          <p>
            {recommendation ||
              "No recommendation available."}
          </p>
        </AnalysisSection>

        <AnalysisSection title="Suggested Steps">
          {steps.length > 0 ? (
            <ol className="space-y-3">
              {steps.map((step, index) => (
                <li
                  key={`${step}-${index}`}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                    {index + 1}
                  </span>

                  <span className="text-slate-700 dark:text-slate-300">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No troubleshooting steps were returned.
            </p>
          )}
        </AnalysisSection>
      </div>
    </section>
  );
}

export default AnalysisPanel;
