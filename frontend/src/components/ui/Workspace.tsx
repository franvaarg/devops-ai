import type { ReactNode } from "react";

export function StatusBadge({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const tone = ["critical", "high", "medium", "low"].includes(
    value.toLowerCase(),
  )
    ? value.toLowerCase()
    : "neutral";
  return (
    <span className={`status-badge status-${tone}`}>
      {label && <span>{label} </span>}
      {value || "Not assessed"}
    </span>
  );
}

export function DecisionMetrics({
  actionability,
  severity,
  confidence,
  risk,
}: {
  actionability?: string;
  severity: string;
  confidence: string;
  risk?: string;
}) {
  return (
    <div className="decision-grid">
      {[
        ["Actionability", actionability || "Not assessed"],
        ["Severity", severity],
        ["Confidence", confidence],
        ["False-positive risk", risk || "Not assessed"],
      ].map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>
            {label === "Severity" ? (
              <StatusBadge value={value} />
            ) : (
              value || "Not assessed"
            )}
          </strong>
        </div>
      ))}
    </div>
  );
}

export function SourceExcerpt({ children }: { children: ReactNode }) {
  return <pre className="source-excerpt">{children}</pre>;
}

export function EvidencePanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`evidence-panel ${className}`}>
      <h3>{title}</h3>
      <div className="evidence-panel-body">{children}</div>
    </div>
  );
}

export function WorkspaceBar({
  label,
  detail,
}: {
  label: string;
  detail: string;
}) {
  return (
    <div className="workspace-bar">
      <span>
        <span className="workspace-indicator" aria-hidden="true" />
        {label}
      </span>
      <span>{detail}</span>
    </div>
  );
}
