const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.json({
    message: "DevOps AI Backend Running 🚀",
  });
});

module.exports = app;