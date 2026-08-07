import { useTheme } from "../context/useTheme";

function Header() {
  const { isDarkMode, toggleTheme } =
    useTheme();

  return (
    <header className="mb-9">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 dark:border-teal-800 dark:bg-teal-950/40">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-600" />
          </span>

          <span className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800 dark:text-teal-300">
            AI-powered troubleshooting
          </span>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-600 dark:hover:bg-slate-800"
        >
          <span className="text-lg">
            {isDarkMode ? "☀️" : "🌙"}
          </span>

          {isDarkMode
            ? "Light Mode"
            : "Dark Mode"}
        </button>
      </div>

      <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
        DevOps{" "}
        <span className="text-emerald-600">
          AI
        </span>
      </h1>

      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
        Analyze infrastructure logs, identify
        likely root causes, and receive
        practical troubleshooting steps
        powered by artificial intelligence.
      </p>
    </header>
  );
}

export default Header;
