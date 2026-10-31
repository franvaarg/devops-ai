import type { ReactNode } from "react";
import { WorkspaceBar } from "./ui/Workspace";

// Shared layout for the real product and its local synthetic demonstration.
export default function IncidentWorkspace({
  input,
  children,
  isAnalyzing = false,
  detail = "16 KiB MAX",
}: {
  input: ReactNode;
  children: ReactNode;
  isAnalyzing?: boolean;
  detail?: string;
}) {
  return (
    <section
      id="workspace"
      tabIndex={-1}
      aria-label="Incident workspace"
      className="workspace-layout"
    >
      <div className="workspace-input">
        <WorkspaceBar label="01 / Incident input" detail={detail} />
        <div className="workspace-input-body">{input}</div>
      </div>
      <div className="workspace-output" aria-busy={isAnalyzing}>
        {isAnalyzing && (
          <p role="status" className="analysis-progress">
            Assessing evidence and noise… Your previous result remains available
            below.
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
