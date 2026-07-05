const { analyzeLog } = require("./services/aiService");
const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    message: "DevOps AI Backend Running 🚀",
  });
});

// Endpoint para analizar logs con IA
app.post("/api/analyze", async (req, res) => {
  try {
    const { log } = req.body;

    const analysis = await analyzeLog(log);

    res.json({
      ...analysis,
      receivedLog: log,
    });
  } catch (error) {
    console.error("AI analysis error:", error);

    res.status(500).json({
      severity: "Unknown",
      summary: "Something went wrong while analyzing the log.",
      rootCause: "Backend error.",
      recommendation: "Check the backend console for details.",
      steps: [],
    });
  }
});
module.exports = app;