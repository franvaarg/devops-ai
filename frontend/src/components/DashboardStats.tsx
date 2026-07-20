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

function DashboardStats({ history, loading }: DashboardStatsProps) {
  const total = history.length;

  const critical = history.filter(
    (item) => item.severity.toLowerCase() === "critical"
  ).length;

  const high = history.filter(
    (item) => item.severity.toLowerCase() === "high"
  ).length;

  const medium = history.filter(
    (item) => item.severity.toLowerCase() === "medium"
  ).length;

  const low = history.filter(
    (item) => item.severity.toLowerCase() === "low"
  ).length;

  const stats = [
    {
      label: "Total Analyses",
      value: total,
      classes: "border-slate-200 bg-white text-slate-950",
    },
    {
      label: "Critical",
      value: critical,
      classes: "border-red-200 bg-red-50 text-red-700",
    },
    {
      label: "High",
      value: high,
      classes: "border-orange-200 bg-orange-50 text-orange-700",
    },
    {
      label: "Medium",
      value: medium,
      classes: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      label: "Low",
      value: low,
      classes: "border-emerald-200 bg-emerald-50 text-emerald-700",
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
          Summary of the analyses currently displayed.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className={`rounded-2xl border p-5 shadow-sm ${stat.classes}`}
          >
            <p className="text-sm font-semibold">{stat.label}</p>

            <p className="mt-3 text-3xl font-bold">
              {loading ? "—" : stat.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DashboardStats;