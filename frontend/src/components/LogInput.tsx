type LogInputProps = {
  log: string;
  setLog: (value: string) => void;
};

function LogInput({ log, setLog }: LogInputProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label
          htmlFor="log-input"
          className="text-sm font-bold text-slate-800 dark:text-slate-100"
        >
          Log content
        </label>

        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {log.length.toLocaleString()} characters
        </span>
      </div>

      <div
        className="
          overflow-hidden
          rounded-2xl
          border
          border-slate-300
          bg-white
          shadow-inner
          transition
          focus-within:border-emerald-500
          focus-within:ring-4
          focus-within:ring-emerald-100
          dark:border-slate-700
          dark:bg-slate-950
          dark:focus-within:ring-emerald-900/40
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
            border-b
            border-slate-300
            bg-slate-100
            px-4
            py-3
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

          <span className="ml-2 font-mono text-xs text-slate-500 dark:text-slate-400">
            system.log
          </span>
        </div>

        <textarea
          id="log-input"
          value={log}
          onChange={(event) => setLog(event.target.value)}
          placeholder="Paste your Docker, Kubernetes, PostgreSQL, Nginx, or application logs here..."
          rows={14}
          className="
            block
            w-full
            resize-y
            border-0
            bg-white
            p-5
            font-mono
            text-sm
            leading-6
            text-slate-900
            outline-none
            placeholder:text-slate-400
            dark:bg-slate-950
            dark:text-slate-100
            dark:placeholder:text-slate-500
          "
        />
      </div>
    </div>
  );
}

export default LogInput;