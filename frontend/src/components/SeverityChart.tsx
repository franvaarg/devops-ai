import {
  Bar,
  BarChart,
  CartesianGrid,
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

  const hasData = chartData.some((item) => item.total > 0);

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
          Distribution of the analyses currently displayed.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 flex h-80 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
          Loading chart...
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
        <div className="mt-6 h-80 w-full">
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} />

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
                cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                formatter={(value) => [value, "Analyses"]}
              />

              <Bar
                dataKey="total"
                name="Analyses"
                fill="#2563eb"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default SeverityChart;