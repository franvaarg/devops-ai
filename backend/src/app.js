const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { analyzeLog } = require("./services/aiService");
const {
  saveAnalysis,
  getHistory,
  deleteAnalysis,
} = require("./services/analysisService");

const authRoutes = require("./routes/authRoutes");
const accountRoutes = require("./routes/accountRoutes");
const authenticateToken = require("./middleware/authenticateToken");
const { analyzeRateLimiter } = require("./middleware/rateLimiters");
const {
  getAnalysisUsage,
  runWithAnalysisQuota,
} = require("./services/quotaService");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.TRUST_PROXY_HOPS) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
}

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS."));
    },
  })
);
app.use(express.json({ limit: "256kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "KANYI Backend Running 🚀",
  });
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

app.post("/api/analyze", authenticateToken, analyzeRateLimiter, async (req, res) => {
  try {
    const { log } = req.body;

    if (typeof log !== "string" || !log.trim()) {
      return res.status(400).json({
        message: "A log is required.",
      });
    }

    const currentUsage = await getAnalysisUsage(req.user.id);

    if (currentUsage.remaining === 0) {
      return res.status(429).json({
        message: "Monthly analysis quota exceeded.",
      });
    }

    const analysis = await analyzeLog(log);

    const quotaResult = await runWithAnalysisQuota(
      req.user.id,
      (client) => saveAnalysis(analysis, log, req.user.id, client)
    );

    if (!quotaResult.allowed) {
      return res.status(429).json({
        message: "Monthly analysis quota exceeded.",
      });
    }

    const savedAnalysis = quotaResult.value;

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

app.get("/api/history", authenticateToken, async (req, res) => {
  try {
    const { severity, search, limit } = req.query;

    const history = await getHistory(req.user.id, {
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

app.delete("/api/history/:id", authenticateToken, async (req, res) => {
  try {
    const analysisId = Number(req.params.id);

    if (!Number.isInteger(analysisId) || analysisId <= 0) {
      return res.status(400).json({
        message: "A valid analysis ID is required.",
      });
    }

    const deletedAnalysis = await deleteAnalysis(
      analysisId,
      req.user.id
    );

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

app.use((error, req, res, next) => {
  if (error.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({
      message: "Request origin is not allowed.",
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      message: "Request body is too large.",
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      message: "Request body must contain valid JSON.",
    });
  }

  console.error("Unhandled request error:", error);

  return res.status(500).json({
    message: "Something went wrong while processing the request.",
  });
});

module.exports = app;
