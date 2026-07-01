function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "700px",
          background: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h1>DevOps AI</h1>

        <p>AI-powered DevOps platform for engineers.</p>

        <textarea
          placeholder="Paste your logs here..."
          rows={12}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "12px",
          }}
        />

        <button
          style={{
            marginTop: "20px",
            padding: "12px 24px",
            cursor: "pointer",
          }}
        >
          Analyze with AI
        </button>
      </div>
    </main>
  );
}

export default App;