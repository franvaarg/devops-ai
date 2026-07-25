import type { SeverityName } from "./dashboardUtils";

type SeverityCardProps = {
  severity: SeverityName;
  label: string;
  value: number;
  dotClasses: string;
  valueClasses: string;
  borderClasses: string;
  activeClasses: string;
  loading: boolean;
  isActive: boolean;
  onClick: (severity: SeverityName) => void;
};

function SeverityCard({
  severity,
  label,
  value,
  dotClasses,
  valueClasses,
  borderClasses,
  activeClasses,
  loading,
  isActive,
  onClick,
}: SeverityCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(severity)}
      disabled={loading}
      aria-pressed={isActive}
      aria-label={
        isActive
          ? `Remove ${label} severity filter`
          : `Filter analyses by ${label} severity`
      }
      className={`group w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:bg-slate-900 dark:border-slate-800 dark:shadow-black/20 dark:focus-visible:ring-emerald-800 disabled:cursor-wait disabled:opacity-70 ${
        isActive
          ? activeClasses
          : `border-slate-200 dark:border-slate-800 ${borderClasses}`
      } ${
        loading
          ? ""
          : "cursor-pointer hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-black/30 active:translate-y-0"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full transition duration-300 ${dotClasses} ${
              isActive
                ? "scale-125 ring-4 ring-current/10"
                : "group-hover:scale-110"
            }`}
            aria-hidden="true"
          />

          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-100">
              {label}
            </p>

            <p
              className={`mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                isActive
                  ? valueClasses
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {isActive
                ? "Filter active"
                : "Click to filter"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="h-8 w-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        ) : (
          <p
            className={`text-2xl font-black tracking-tight ${valueClasses}`}
          >
            {value}
          </p>
        )}
      </div>
    </button>
  );
}

export default SeverityCard;