type LogInputProps = {
  log: string;
  setLog: (value: string) => void;
};

function LogInput({ log, setLog }: LogInputProps) {
  return (
    <textarea
      value={log}
      onChange={(e) => setLog(e.target.value)}
      placeholder="Paste your logs here..."
      rows={12}
      style={{ width: "100%", marginTop: "20px", padding: "12px" }}
    />
  );
}

export default LogInput;
