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
  Low: "#16a34a",
};

function SeverityChart({ history, loading }: SeverityChartProps) {
  const chartData = [
    {
      severity: "Critical",
      total: history.filter(
        (item) => item.severity.toLowerCase() === "critical"
      ).length,
    },
    {
      severity: "High",
      total: history.filter(
        (item) => item.severity.toLowerCase() === "high"
      ).length,
    },
    {
      severity: "Medium",
      total: history.filter(
        (item) => item.severity.toLowerCase() === "medium"
      ).length,
    },
    {
      severity: "Low",
      total: history.filter(
        (item) => item.severity.toLowerCase() === "low"
      ).length,
    },
  ];

  const pieData = chartData.filter((item) => item.total > 0);

  const hasData = pieData.length > 0;

  const totalAnalyses = chartData.reduce(
    (total, item) => total + item.total,
    0
  );

  function calculatePercentage(value: number) {
    if (totalAnalyses === 0) {
      return 0;
    }

    return Math.round((value / totalAnalyses) * 100);
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Severity distribution
        </p>

        <h3 className="mt-1 text-xl font-bold text-slate-950">
          Analyses by Severity
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Compare the number and percentage of incidents in each severity
          category.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 flex h-80 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
          Loading charts...
        </div>
      ) : !hasData ? (
        <div className="mt-6 flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
          <div>
            <p className="font-semibold text-slate-700">
              No chart data available
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Analyze a log or clear the current filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h4 className="font-bold text-slate-900">
                Incident Count
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Total analyses grouped by severity.
              </p>
            </div>

            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="severity"
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    cursor={{
                      fill: "rgba(148, 163, 184, 0.12)",
                    }}
                    formatter={(value) => [
                      Number(value),
                      "Analyses",
                    ]}
                  />

                  <Bar
                    dataKey="total"
                    name="Analyses"
                    radius={[8, 8, 0, 0]}
                  >
                    {chartData.map((item) => (
                      <Cell
                        key={item.severity}
                        fill={severityColors[item.severity]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h4 className="font-bold text-slate-900">
                Percentage Distribution
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Percentage of the total represented by each severity.
              </p>
            </div>

            <div className="mt-4 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="total"
                    nameKey="severity"
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                  >
                    {pieData.map((item) => (
                      <Cell
                        key={item.severity}
                        fill={severityColors[item.severity]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value, _name, item) => {
                      const numericValue = Number(value);

                      return [
                        `${numericValue} analyses (${calculatePercentage(
                          numericValue
                        )}%)`,
                        item.payload.severity,
                      ];
                    }}
                  />

                  <Legend
                    verticalAlign="bottom"
                    formatter={(value) => {
                      const item = chartData.find(
                        (entry) => entry.severity === value
                      );

                      const percentage = item
                        ? calculatePercentage(item.total)
                        : 0;

                      return `${value} — ${percentage}%`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

export default SeverityChart;