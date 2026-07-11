function Header() {
  return (
    <header className="mb-8">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">
        AI-powered troubleshooting
      </p>

      <h1 className="text-4xl font-bold tracking-tight text-slate-950">
        DevOps AI
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        Analyze infrastructure logs, identify likely root causes and receive
        practical troubleshooting steps.
      </p>
    </header>
  );
}

export default Header;