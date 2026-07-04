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

// Endpoint para analizar logs
app.post("/api/analyze", (req, res) => {
  const { log } = req.body;

  res.json({
    summary: "Log received successfully.",
    recommendation: "AI analysis will be added in the next sprint.",
    receivedLog: log,
  });
});

module.exports = app;