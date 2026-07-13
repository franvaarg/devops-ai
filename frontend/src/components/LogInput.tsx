type LogInputProps = {
  log: string;
  setLog: (value: string) => void;
};

function LogInput({ log, setLog }: LogInputProps) {
  return (
    <div>
      <label
        htmlFor="log-input"
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        Log content
      </label>

      <textarea
        id="log-input"
        value={log}
        onChange={(event) => setLog(event.target.value)}
        placeholder="Paste your Docker, Kubernetes, PostgreSQL, Nginx or application logs here..."
        rows={14}
        className="w-full resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

export default LogInput;