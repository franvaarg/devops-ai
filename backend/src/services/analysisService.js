const pool = require("../database/db");

async function saveAnalysis(analysis, originalLog) {
  const query = `
    INSERT INTO analyses (
      severity,
      summary,
      root_cause,
      recommendation,
      steps,
      original_log
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [
    analysis.severity,
    analysis.summary,
    analysis.rootCause,
    analysis.recommendation,
    analysis.steps,
    originalLog,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

module.exports = {
  saveAnalysis,
};