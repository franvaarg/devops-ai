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

async function getHistory(filters = {}) {
  const { severity, search, limit = 50 } = filters;

  const conditions = [];
  const values = [];

  if (severity) {
    values.push(severity);
    conditions.push(`severity = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);

    const searchPosition = values.length;

    conditions.push(`
      (
        summary ILIKE $${searchPosition}
        OR root_cause ILIKE $${searchPosition}
        OR recommendation ILIKE $${searchPosition}
        OR original_log ILIKE $${searchPosition}
      )
    `);
  }

  const parsedLimit = Number(limit);
  const safeLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 50;

  values.push(safeLimit);

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const query = `
    SELECT
      id,
      severity,
      summary,
      root_cause,
      recommendation,
      steps,
      original_log,
      created_at
    FROM analyses
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${values.length};
  `;

  const result = await pool.query(query, values);

  return result.rows;
}

module.exports = {
  saveAnalysis,
  getHistory,
};