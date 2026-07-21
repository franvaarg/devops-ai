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

type DashboardStatsProps = {
  history: HistoryItem[];
  loading: boolean;
};

type SeverityName = "critical" | "high" | "medium" | "low";

const severityWeights: Record<SeverityName, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function DashboardStats({ history, loading }: DashboardStatsProps) {
  const total = history.length;

  const severityCounts = {
    critical: history.filter(
      (item) => item.severity.toLowerCase() === "critical"
    ).length,

    high: history.filter(
      (item) => item.severity.toLowerCase() === "high"
    ).length,

    medium: history.filter(
      (item) => item.severity.toLowerCase() === "medium"
    ).length,

    low: history.filter(
      (item) => item.severity.toLowerCase() === "low"
    ).length,
  };

  const criticalRate =
    total > 0
      ? Math.round((severityCounts.critical / total) * 100)
      : 0;

  const averageSeverityScore =
    total > 0
      ? history.reduce((totalScore, item) => {
          const severity =
            item.severity.toLowerCase() as SeverityName;

          return totalScore + (severityWeights[severity] ?? 0);
        }, 0) / total
      : 0;

  function getAverageSeverityLabel(score: number) {
    if (score >= 3.5) {
      return "Critical";
    }

    if (score >= 2.5) {
      return "High";
    }

    if (score >= 1.5) {
      return "Medium";
    }

    if (score > 0) {
      return "Low";
    }

    return "No data";
  }

  const averageSeverity =
    getAverageSeverityLabel(averageSeverityScore);

  const latestAnalysis =
    history.length > 0
      ? [...history].sort(
          (firstItem, secondItem) =>
            new Date(secondItem.createdAt).getTime() -
            new Date(firstItem.createdAt).getTime()
        )[0]
      : null;

  function formatDate(dateValue: string) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const mainStats = [
    {
      label: "Total Analyses",
      value: total,
      description: "Results currently loaded",
      classes:
        "border-slate-200 bg-white text-slate-950",
    },
    {
      label: "Critical Rate",
      value: `${criticalRate}%`,
      description: `${severityCounts.critical} critical incidents`,
      classes:
        "border-red-200 bg-red-50 text-red-700",
    },
    {
      label: "Average Severity",
      value: averageSeverity,
      description:
        total > 0
          ? `Average score ${averageSeverityScore.toFixed(1)} / 4`
          : "No analyses available",
      classes:
        "border-orange-200 bg-orange-50 text-orange-700",
    },
    {
      label: "Latest Analysis",
      value: latestAnalysis
        ? formatDate(latestAnalysis.createdAt)
        : "No data",
      description: latestAnalysis
        ? latestAnalysis.severity
        : "No analyses available",
      classes:
        "border-blue-200 bg-blue-50 text-blue-700",
    },
  ];

  const severityStats = [
    {
      label: "Critical",
      value: severityCounts.critical,
      classes:
        "border-red-200 bg-red-50 text-red-700",
    },
    {
      label: "High",
      value: severityCounts.high,
      classes:
        "border-orange-200 bg-orange-50 text-orange-700",
    },
    {
      label: "Medium",
      value: severityCounts.medium,
      classes:
        "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      label: "Low",
      value: severityCounts.low,
      classes:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <section className="mt-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Overview
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-950">
          Analysis Dashboard
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Operational metrics calculated from the currently
          displayed analyses.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mainStats.map((stat) => (
          <article
            key={stat.label}
            className={`rounded-2xl border p-5 shadow-sm ${stat.classes}`}
          >
            <p className="text-sm font-semibold">
              {stat.label}
            </p>

            <p className="mt-3 text-2xl font-bold">
              {loading ? "—" : stat.value}
            </p>

            <p className="mt-2 text-xs opacity-75">
              {loading ? "Loading dashboard..." : stat.description}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {severityStats.map((stat) => (
          <article
            key={stat.label}
            className={`rounded-2xl border p-4 shadow-sm ${stat.classes}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {stat.label}
              </p>

              <p className="text-2xl font-bold">
                {loading ? "—" : stat.value}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DashboardStats;