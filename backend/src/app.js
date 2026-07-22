const express = require("express");
const cors = require("cors");

const { analyzeLog } = require("./services/aiService");
const {
  saveAnalysis,
  getHistory,
  deleteAnalysis,
} = require("./services/analysisService");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "DevOps AI Backend Running 🚀",
  });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { log } = req.body;

    if (!log || !log.trim()) {
      return res.status(400).json({
        message: "A log is required.",
      });
    }

    const analysis = await analyzeLog(log);
    const savedAnalysis = await saveAnalysis(analysis, log);

    return res.status(201).json({
      id: savedAnalysis.id,
      severity: savedAnalysis.severity,
      summary: savedAnalysis.summary,
      rootCause: savedAnalysis.root_cause,
      recommendation: savedAnalysis.recommendation,
      steps: savedAnalysis.steps,
      originalLog: savedAnalysis.original_log,
      createdAt: savedAnalysis.created_at,
    });
  } catch (error) {
    console.error("Analysis error:", error);

    return res.status(500).json({
      severity: "Unknown",
      summary: "Something went wrong while analyzing or saving the log.",
      rootCause: "Backend or database error.",
      recommendation: "Check the backend console for details.",
      steps: [],
    });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const { severity, search, limit } = req.query;

    const history = await getHistory({
      severity:
        typeof severity === "string" && severity.trim()
          ? severity.trim()
          : undefined,
      search:
        typeof search === "string" && search.trim()
          ? search.trim()
          : undefined,
      limit: typeof limit === "string" ? limit : undefined,
    });

    return res.status(200).json(
      history.map((analysis) => ({
        id: analysis.id,
        severity: analysis.severity,
        summary: analysis.summary,
        rootCause: analysis.root_cause,
        recommendation: analysis.recommendation,
        steps: analysis.steps,
        originalLog: analysis.original_log,
        createdAt: analysis.created_at,
      }))
    );
  } catch (error) {
    console.error("History error:", error);

    return res.status(500).json({
      message: "Something went wrong while loading the analysis history.",
    });
  }
});

app.delete("/api/history/:id", async (req, res) => {
  try {
    const analysisId = Number(req.params.id);

    if (!Number.isInteger(analysisId) || analysisId <= 0) {
      return res.status(400).json({
        message: "A valid analysis ID is required.",
      });
    }

    const deletedAnalysis = await deleteAnalysis(analysisId);

    if (!deletedAnalysis) {
      return res.status(404).json({
        message: "Analysis not found.",
      });
    }

    return res.status(200).json({
      message: "Analysis deleted successfully.",
      deletedAnalysis: {
        id: deletedAnalysis.id,
        severity: deletedAnalysis.severity,
        summary: deletedAnalysis.summary,
        rootCause: deletedAnalysis.root_cause,
        recommendation: deletedAnalysis.recommendation,
        steps: deletedAnalysis.steps,
        originalLog: deletedAnalysis.original_log,
        createdAt: deletedAnalysis.created_at,
      },
    });
  } catch (error) {
    console.error("Delete analysis error:", error);

    return res.status(500).json({
      message: "Something went wrong while deleting the analysis.",
    });
  }
});

module.exports = app;