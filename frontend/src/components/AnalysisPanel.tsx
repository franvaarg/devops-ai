import {
  DecisionMetrics,
  EvidencePanel as AnalysisSection,
  StatusBadge,
  WorkspaceBar,
} from "./ui/Workspace";
import type { InputSignals } from "../services/api";

type AnalysisPanelProps = {
  missingInformation?: string[];
  verificationSteps?: string[];
  inputSignals?: InputSignals;
  operationalContext?: string;
  actionability?: string;
  falsePositiveRisk?: string;
  noiseAssessment?: string;
  severity: string;
  summary: string;
  evidence: string[];
  rootCause: string;
  confidence: string;
  recommendation: string;
  steps: string[];
};

function AnalysisPanel({
  missingInformation,
  verificationSteps,
  actionability,
  falsePositiveRisk,
  noiseAssessment,
  operationalContext,
  inputSignals,
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
    steps.length > 0,
  );

  if (!hasAnalysis)
    return (
      <section className="assessment-empty" aria-label="Incident assessment">
        <WorkspaceBar label="Assessment" detail="AWAITING INPUT" />
        <div>
          <span className="section-kicker">Evidence before certainty</span>
          <h2>Incident assessment</h2>
          <p>
            Your next AI-generated diagnosis will appear here after you analyze
            a log.
          </p>
          <p className="text-sm">
            Severity · Confidence · Source evidence · Recommended checks
          </p>
        </div>
      </section>
    );

  return (
    <section
      className="assessment-result"
      aria-label="Incident assessment result"
    >
      <WorkspaceBar label="Incident assessment" detail="REVIEW REQUIRED" />
      <div className="assessment-heading">
        <div>
          <span className="section-kicker">Analysis / decision support</span>
          <h2>Incident assessment</h2>
        </div>
        <StatusBadge value={severity} />
      </div>
      <div className="assessment-body">
        <DecisionMetrics
          actionability={actionability}
          severity={severity}
          confidence={confidence}
          risk={falsePositiveRisk}
        />
        <p className="assessment-disclaimer">
          Assessment of the submitted excerpt only. Confidence is qualitative.
          Verify impact and recommendations before making production changes.
        </p>
        {inputSignals && (
          <p className="text-sm">
            Excerpt checks: {inputSignals.lineCount} nonempty lines ·{" "}
            {inputSignals.duplicateLineCount} exact repeats ·{" "}
            {inputSignals.olderThanSevenDaysCount} timestamps older than seven
            days at submission · {inputSignals.futureTimestampCount} future
            timestamps. Only full timestamps with timezone are checked.
            Repetition or age alone does not establish noise or current service
            health.
          </p>
        )}

        {operationalContext && (
          <details className="rounded-xl border p-4">
            <summary className="cursor-pointer font-semibold">
              User-reported operational context
            </summary>
            <p className="mt-3 break-words">{operationalContext}</p>
          </details>
        )}
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

        <AnalysisSection
          title={`Likely Root Cause · ${confidence || "Low"} confidence`}
        >
          <p>{rootCause || "No root cause available."}</p>
        </AnalysisSection>

        <AnalysisSection title="Unknown / missing information">
          {missingInformation?.length ? (
            <ul className="list-disc pl-5">
              {missingInformation.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>
              No additional missing information was recorded. This does not
              establish that the diagnosis is complete.
            </p>
          )}
        </AnalysisSection>
        <AnalysisSection title="Verification steps">
          {verificationSteps?.length ? (
            <ol className="list-decimal pl-5">
              {verificationSteps.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          ) : (
            <p>
              This older analysis has no separate verification steps. Confirm
              impact and cause before applying changes.
            </p>
          )}
        </AnalysisSection>
        <AnalysisSection title="Recommendation">
          <p>{recommendation || "No recommendation available."}</p>
        </AnalysisSection>

        <AnalysisSection title="Suggested Steps">
          {steps.length > 0 ? (
            <ol className="space-y-3">
              {steps.map((step, index) => (
                <li
                  key={`${step}-${index}`}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
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
        <AnalysisSection title="Noise and legacy-log assessment">
          <p>
            {noiseAssessment ||
              "This older analysis predates noise assessment. Reanalyze the relevant log window to assess actionability and false-positive risk."}
          </p>
        </AnalysisSection>
      </div>
    </section>
  );
}

export default AnalysisPanel;
