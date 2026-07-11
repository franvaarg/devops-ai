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

type HistoryListProps = {
  history: HistoryItem[];
  loading: boolean;
};

function HistoryList({ history, loading }: HistoryListProps) {
  if (loading) {
    return (
      <section style={{ marginTop: "32px" }}>
        <h2>Analysis History</h2>
        <p>Loading history...</p>
      </section>
    );
  }

  return (
    <section style={{ marginTop: "32px" }}>
      <h2>Analysis History</h2>

      {history.length === 0 ? (
        <p>No saved analyses yet.</p>
      ) : (
        history.map((item) => (
          <article
            key={item.id}
            style={{
              marginTop: "16px",
              padding: "16px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
            }}
          >
            <p>
              <strong>Severity:</strong> {item.severity}
            </p>

            <p>
              <strong>Summary:</strong> {item.summary}
            </p>

            <p>
              <strong>Date:</strong>{" "}
              {new Date(item.createdAt).toLocaleString()}
            </p>
          </article>
        ))
      )}
    </section>
  );
}

export default HistoryList;