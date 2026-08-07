import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTheme } from "../context/useTheme";

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

type SeverityChartProps = {
  history: HistoryItem[];
  loading: boolean;
};

const severityColors: Record<string, string> = {
  Critical: "#dc2626",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#10b981",
};

function ChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 19V9m6 10V5m6 14v-7m4 7H2"
      />
    </svg>
  );
}

function SeverityChart({
  history,
  loading,
}: SeverityChartProps) {
  const { theme } = useTheme();

  const isDark = theme === "dark";

  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const axisColor = isDark ? "#94a3b8" : "#64748b";
  const secondaryAxisColor = isDark
    ? "#64748b"
    : "#94a3b8";
  const pieStrokeColor = isDark
    ? "#0f172a"
    : "#ffffff";

  const tooltipStyles = {
    borderRadius: "16px",
    border: `1px solid ${
      isDark ? "#334155" : "#e2e8f0"
    }`,
    backgroundColor: isDark
      ? "#0f172a"
      : "#ffffff",
    boxShadow: isDark
      ? "0 12px 32px rgba(0, 0, 0, 0.35)"
      : "0 12px 32px rgba(15, 23, 42, 0.12)",
    padding: "12px 14px",
  };

  const chartData = [
    {
      severity: "Critical",
      total: history.filter(
        (item) =>
          item.severity.toLowerCase() === "critical"
      ).length,
    },
    {
      severity: "High",
      total: history.filter(
        (item) =>
          item.severity.toLowerCase() === "high"
      ).length,
    },
    {
      severity: "Medium",
      total: history.filter(
        (item) =>
          item.severity.toLowerCase() === "medium"
      ).length,
    },
    {
      severity: "Low",
      total: history.filter(
        (item) =>
          item.severity.toLowerCase() === "low"
      ).length,
    },
  ];

  const pieData = chartData.filter(
    (item) => item.total > 0
  );

  const hasData = pieData.length > 0;

  const totalAnalyses = chartData.reduce(
    (total, item) => total + item.total,
    0
  );

  function calculatePercentage(value: number) {
    if (totalAnalyses === 0) {
      return 0;
    }

    return Math.round(
      (value / totalAnalyses) * 100
    );
  }

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/80 p-6 dark:border-slate-800 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/40 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300">
            <ChartIcon />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              Severity distribution
            </p>

            <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              Analyses by Severity
            </h3>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Compare the number and percentage of
              incidents across every severity category.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="h-5 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />

                <div className="mt-3 h-4 w-52 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />

                <div className="mt-8 h-64 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/80" />
              </div>
            ))}
          </div>
        ) : !hasData ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 px-6 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400 dark:shadow-black/20">
                <ChartIcon />
              </div>

              <p className="mt-5 font-bold text-slate-800 dark:text-slate-100">
                No chart data available
              </p>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Analyze a log or clear the current
                filters to generate severity metrics.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 transition duration-300 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700 dark:hover:shadow-black/30 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="font-black tracking-tight text-slate-900 dark:text-white">
                    Incident Count
                  </h4>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Total analyses grouped by severity.
                  </p>
                </div>

                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {totalAnalyses} total
                </span>
              </div>

              <div className="mt-5 h-80 w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 8,
                      left: -22,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      stroke={gridColor}
                      strokeDasharray="4 4"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="severity"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: axisColor,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: secondaryAxisColor,
                        fontSize: 12,
                      }}
                    />

                    <Tooltip
                      cursor={{
                        fill: isDark
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(16, 185, 129, 0.06)",
                      }}
                      contentStyle={tooltipStyles}
                      labelStyle={{
                        color: isDark
                          ? "#f8fafc"
                          : "#0f172a",
                        fontWeight: 700,
                        marginBottom: "4px",
                      }}
                      itemStyle={{
                        color: isDark
                          ? "#cbd5e1"
                          : "#475569",
                        fontWeight: 600,
                      }}
                      formatter={(value) => [
                        Number(value),
                        "Analyses",
                      ]}
                    />

                    <Bar
                      dataKey="total"
                      name="Analyses"
                      radius={[10, 10, 4, 4]}
                      maxBarSize={58}
                    >
                      {chartData.map((item) => (
                        <Cell
                          key={item.severity}
                          fill={
                            severityColors[
                              item.severity
                            ]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 transition duration-300 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700 dark:hover:shadow-black/30 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h4 className="font-black tracking-tight text-slate-900 dark:text-white">
                    Percentage Distribution
                  </h4>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Share represented by each category.
                  </p>
                </div>

                <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 dark:border-teal-900/70 dark:bg-teal-950/50 dark:text-teal-300">
                  100% coverage
                </span>
              </div>

              <div className="relative mt-5 h-80 w-full">
                <div className="pointer-events-none absolute left-1/2 top-[42%] z-10 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                    {totalAnalyses}
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Analyses
                  </p>
                </div>

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="total"
                      nameKey="severity"
                      cx="50%"
                      cy="42%"
                      innerRadius={68}
                      outerRadius={108}
                      paddingAngle={4}
                      cornerRadius={7}
                      stroke={pieStrokeColor}
                      strokeWidth={3}
                    >
                      {pieData.map((item) => (
                        <Cell
                          key={item.severity}
                          fill={
                            severityColors[
                              item.severity
                            ]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={tooltipStyles}
                      labelStyle={{
                        color: isDark
                          ? "#f8fafc"
                          : "#0f172a",
                        fontWeight: 700,
                      }}
                      itemStyle={{
                        color: isDark
                          ? "#cbd5e1"
                          : "#475569",
                        fontWeight: 600,
                      }}
                      formatter={(
                        value,
                        _name,
                        item
                      ) => {
                        const numericValue =
                          Number(value);

                        return [
                          `${numericValue} ${
                            numericValue === 1
                              ? "analysis"
                              : "analyses"
                          } (${calculatePercentage(
                            numericValue
                          )}%)`,
                          item.payload.severity,
                        ];
                      }}
                    />

                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={9}
                      formatter={(value) => {
                        const item = chartData.find(
                          (entry) =>
                            entry.severity === value
                        );

                        const percentage = item
                          ? calculatePercentage(
                              item.total
                            )
                          : 0;

                        return `${value} · ${percentage}%`;
                      }}
                      wrapperStyle={{
                        color: isDark
                          ? "#cbd5e1"
                          : "#475569",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}

export default SeverityChart;
