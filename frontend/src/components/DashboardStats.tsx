import type { HistoryItem } from "../services/api";

import DashboardCard from "./dashboard/DashboardCard";
import SeverityCard from "./dashboard/SeverityCard";

import {
  AlertIcon,
  ChartIcon,
  ClockIcon,
  GaugeIcon,
} from "./dashboard/DashboardIcons";

import {
  formatDashboardDate,
  getAverageSeverityLabel,
  getAverageSeverityScore,
  getCriticalRate,
  getLatestAnalysis,
  getSeverityCounts,
  type SeverityName,
} from "./dashboard/dashboardUtils";

type DashboardStatsProps = {
  history: HistoryItem[];
  loading: boolean;
  selectedSeverity: string;
  onSeverityClick: (severity: SeverityName) => void;
};

function DashboardStats({
  history,
  loading,
  selectedSeverity,
  onSeverityClick,
}: DashboardStatsProps) {
  const total = history.length;

  const severityCounts = getSeverityCounts(history);

  const criticalRate = getCriticalRate(
    total,
    severityCounts.critical
  );

  const averageSeverityScore =
    getAverageSeverityScore(history);

  const averageSeverity = getAverageSeverityLabel(
    averageSeverityScore
  );

  const latestAnalysis = getLatestAnalysis(history);

  const normalizedSelectedSeverity =
    selectedSeverity.toLowerCase();

  const mainStats = [
    {
      label: "Total Analyses",
      value: total,
      description: "Results currently loaded",
      icon: ChartIcon,
      iconClasses:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
      accentClasses: "bg-emerald-500",
      valueClasses:
        "text-slate-950 dark:text-white",
    },
    {
      label: "Critical Rate",
      value: `${criticalRate}%`,
      description: `${
        severityCounts.critical
      } critical ${
        severityCounts.critical === 1
          ? "incident"
          : "incidents"
      }`,
      icon: AlertIcon,
      iconClasses:
        "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300",
      accentClasses: "bg-red-500",
      valueClasses:
        "text-red-700 dark:text-red-300",
    },
    {
      label: "Average Severity",
      value: averageSeverity,
      description:
        total > 0
          ? `Average score ${averageSeverityScore.toFixed(
              1
            )} / 4`
          : "No analyses available",
      icon: GaugeIcon,
      iconClasses:
        "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
      accentClasses: "bg-amber-500",
      valueClasses:
        "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Latest Analysis",
      value: latestAnalysis
        ? formatDashboardDate(
            latestAnalysis.createdAt
          )
        : "No data",
      description: latestAnalysis
        ? `${latestAnalysis.severity} severity`
        : "No analyses available",
      icon: ClockIcon,
      iconClasses:
        "bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300",
      accentClasses: "bg-teal-500",
      valueClasses:
        "text-teal-700 dark:text-teal-300",
    },
  ];

  const severityStats: Array<{
    severity: SeverityName;
    label: string;
    value: number;
    dotClasses: string;
    valueClasses: string;
    borderClasses: string;
    activeClasses: string;
  }> = [
    {
      severity: "critical",
      label: "Critical",
      value: severityCounts.critical,
      dotClasses: "bg-red-500 text-red-500",
      valueClasses:
        "text-red-700 dark:text-red-300",
      borderClasses:
        "hover:border-red-300 dark:hover:border-red-700",
      activeClasses:
        "border-red-400 bg-red-50 shadow-md shadow-red-100 ring-2 ring-red-100 dark:border-red-700 dark:bg-red-950/40 dark:shadow-red-950/30 dark:ring-red-900/60",
    },
    {
      severity: "high",
      label: "High",
      value: severityCounts.high,
      dotClasses:
        "bg-orange-500 text-orange-500",
      valueClasses:
        "text-orange-700 dark:text-orange-300",
      borderClasses:
        "hover:border-orange-300 dark:hover:border-orange-700",
      activeClasses:
        "border-orange-400 bg-orange-50 shadow-md shadow-orange-100 ring-2 ring-orange-100 dark:border-orange-700 dark:bg-orange-950/40 dark:shadow-orange-950/30 dark:ring-orange-900/60",
    },
    {
      severity: "medium",
      label: "Medium",
      value: severityCounts.medium,
      dotClasses:
        "bg-amber-500 text-amber-500",
      valueClasses:
        "text-amber-700 dark:text-amber-300",
      borderClasses:
        "hover:border-amber-300 dark:hover:border-amber-700",
      activeClasses:
        "border-amber-400 bg-amber-50 shadow-md shadow-amber-100 ring-2 ring-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:shadow-amber-950/30 dark:ring-amber-900/60",
    },
    {
      severity: "low",
      label: "Low",
      value: severityCounts.low,
      dotClasses:
        "bg-emerald-500 text-emerald-500",
      valueClasses:
        "text-emerald-700 dark:text-emerald-300",
      borderClasses:
        "hover:border-emerald-300 dark:hover:border-emerald-700",
      activeClasses:
        "border-emerald-400 bg-emerald-50 shadow-md shadow-emerald-100 ring-2 ring-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:shadow-emerald-950/30 dark:ring-emerald-900/60",
    },
  ];

  return (
    <section className="mt-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 dark:border-emerald-900/70 dark:bg-emerald-950/40">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Dashboard overview
            </p>
          </div>

          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Analysis Dashboard
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Real-time operational metrics generated
            from the analyses currently displayed.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:shadow-black/20">
          <span
            className={`h-2 w-2 rounded-full ${
              loading
                ? "animate-pulse bg-amber-400"
                : "bg-emerald-500"
            }`}
          />

          {loading
            ? "Refreshing metrics"
            : normalizedSelectedSeverity
              ? `${
                  normalizedSelectedSeverity
                    .charAt(0)
                    .toUpperCase() +
                  normalizedSelectedSeverity.slice(1)
                } filter active`
              : "Metrics up to date"}
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {mainStats.map((stat) => (
          <DashboardCard
            key={stat.label}
            {...stat}
            loading={loading}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {severityStats.map((stat) => (
          <SeverityCard
            key={stat.severity}
            {...stat}
            loading={loading}
            isActive={
              normalizedSelectedSeverity ===
              stat.severity
            }
            onClick={onSeverityClick}
          />
        ))}
      </div>

      {normalizedSelectedSeverity && (
        <p
          className="mt-4 text-center text-xs font-medium text-slate-500 dark:text-slate-400"
          role="status"
        >
          Showing{" "}
          <span className="font-bold capitalize text-slate-700 dark:text-slate-200">
            {normalizedSelectedSeverity}
          </span>{" "}
          analyses. Click the selected card again to
          remove the filter.
        </p>
      )}
    </section>
  );
}

export default DashboardStats;