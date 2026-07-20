import { useState } from "react";

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
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function toggleAnalysis(id: number) {
    setExpandedId((currentId) => (currentId === id ? null : id));
  }

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

        {!loading && history.length > 0 &&