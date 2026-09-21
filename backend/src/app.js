const { randomUUID } = require("node:crypto");
const { AppError } = require("./operations/errors");
const { operations, errorHandler } = require("./middleware/operations");
const { logFailure } = require("./operations/logger");
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
  reserveAnalysis,
  completeAnalysis,
  releaseAnalysis,
} = require("./services/quotaService");

const { redactSecrets } = require("./security/redactSecrets");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.TRUST_PROXY_HOPS) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
}

app.disable("x-powered-by");
app.use(operations);
app.use(helmet());
app.use(
  cors({
    exposedHeaders: ["X-Request-ID", "Idempotency-Key"],
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

app.post("/api/analyze", authenticateToken, analyzeRateLimiter, async (req, res, next) => {
  let reserved = false;
  let requestKey;
  try {
    const { log } = req.body || {};

    if (typeof log !== "string" || !log.trim()) {
      return res.status(400).json({
        message: "A log is required.",
      });
    }

    requestKey = req.get("Idempotency-Key") || randomUUID();
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(requestKey)) throw new AppError('VALIDATION_ERROR');
    res.setHeader('Idempotency-Key', requestKey);
    const redactedLog = redactSecrets(log);
    const reservation = await reserveAnalysis(req.user.id, requestKey, redactedLog);
    let savedAnalysis = reservation.replay;
    if (!savedAnalysis) {
      reserved = true;
      const analysis = await analyzeLog(redactedLog);
      savedAnalysis = await completeAnalysis(req.user.id, requestKey,
        (client) => saveAnalysis(analysis, redactedLog, req.user.id, client));
      reserved = false;
    }

    return res.status(201).json({
      id: savedAnalysis.id,
      severity: savedAnalysis.severity,
      summary: savedAnalysis.summary,
      evidence: savedAnalysis.evidence,
      rootCause: savedAnalysis.root_cause,
      confidence: savedAnalysis.confidence,
      recommendation: savedAnalysis.recommendation,
      steps: savedAnalysis.steps,
      originalLog: savedAnalysis.original_log,
      createdAt: savedAnalysis.created_at,
    });
  } catch (error) {
    if (reserved) {
      try { await releaseAnalysis(req.user.id, requestKey); }
      catch (releaseError) { logFailure('quota_release_failed', releaseError); }
    }
    return next(error);
  }
});

app.get("/api/history", authenticateToken, async (req, res, next) => {
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
        evidence: analysis.evidence,
        rootCause: analysis.root_cause,
        confidence: analysis.confidence,
        recommendation: analysis.recommendation,
        steps: analysis.steps,
        originalLog: analysis.original_log,
        createdAt: analysis.created_at,
      }))
    );
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/history/:id", authenticateToken, async (req, res, next) => {
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
        evidence: deletedAnalysis.evidence,
        rootCause: deletedAnalysis.root_cause,
        confidence: deletedAnalysis.confidence,
        recommendation: deletedAnalysis.recommendation,
        steps: deletedAnalysis.steps,
        originalLog: deletedAnalysis.original_log,
        createdAt: deletedAnalysis.created_at,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.use((req, res, next) => next(new AppError('RESOURCE_NOT_FOUND')));
app.use(errorHandler);

module.exports = app;
