import type { ComponentType } from "react";

import type { IconProps } from "./DashboardIcons";

type DashboardCardProps = {
  label: string;
  value: string | number;
  description: string;
  icon: ComponentType<IconProps>;
  iconClasses: string;
  accentClasses: string;
  valueClasses: string;
  loading: boolean;
};

function DashboardCard({
  label,
  value,
  description,
  icon: Icon,
  iconClasses,
  accentClasses,
  valueClasses,
  loading,
}: DashboardCardProps) {
  return (
    <article
      className="
        group
        relative
        overflow-hidden
        rounded-3xl
        border
        border-slate-200
        bg-white
        p-5
        shadow-sm
        transition
        duration-300

        hover:-translate-y-1
        hover:border-slate-300
        hover:shadow-xl
        hover:shadow-slate-200/60

        dark:border-slate-800
        dark:bg-slate-900
        dark:shadow-black/10
        dark:hover:border-slate-700
        dark:hover:shadow-black/30
      "
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 ${accentClasses}`}
      />

      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl transition duration-300 group-hover:scale-105 ${iconClasses}`}
        >
          <Icon />
        </div>

        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Live
        </span>
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
        {label}
      </p>

      {loading ? (
        <div className="mt-3 h-9 w-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      ) : (
        <p
          className={`mt-3 break-words text-3xl font-black tracking-tight ${valueClasses}`}
        >
          {value}
        </p>
      )}

      {loading ? (
        <div className="mt-3 h-4 w-36 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      ) : (
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </article>
  );
}

export default DashboardCard;