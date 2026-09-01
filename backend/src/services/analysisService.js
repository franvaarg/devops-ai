const pool = require("../database/db");

async function saveAnalysis(analysis, originalLog, userId, database = pool) {
  const query = `
    INSERT INTO analyses (
      severity,
      summary,
      evidence,
      root_cause,
      confidence,
      recommendation,
      steps,
      original_log,
      user_id
    )
    VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7::jsonb, $8, $9)
    RETURNING
      id,
      severity,
      summary,
      evidence,
      root_cause,
      confidence,
      recommendation,
      steps,
      original_log,
      user_id,
      created_at;
  `;

  const values = [
    analysis.severity,
    analysis.summary,
    JSON.stringify(analysis.evidence ?? []),
    analysis.rootCause,
    analysis.confidence,
    analysis.recommendation,
    JSON.stringify(analysis.steps ?? []),
    originalLog,
    userId,
  ];

  const result = await database.query(query, values);

  return result.rows[0];
}

async function getHistory(userId, filters = {}) {
  const { severity, search, limit = 50 } = filters;

  const conditions = [];
  const values = [];

  values.push(userId);
  conditions.push(`user_id = $${values.length}`);

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

  const query = `
    SELECT
      id,
      severity,
      summary,
      evidence,
      root_cause,
      confidence,
      recommendation,
      steps,
      original_log,
      user_id,
      created_at
    FROM analyses
    WHERE ${conditions.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT $${values.length};
  `;

  const result = await pool.query(query, values);

  return result.rows;
}

async function deleteAnalysis(id, userId) {
  const query = `
    DELETE FROM analyses
    WHERE id = $1
      AND user_id = $2
    RETURNING
      id,
      severity,
      summary,
      evidence,
      root_cause,
      confidence,
      recommendation,
      steps,
      original_log,
      user_id,
      created_at;
  `;

  const result = await pool.query(query, [id, userId]);

  return result.rows[0] ?? null;
}

module.exports = {
  saveAnalysis,
  getHistory,
  deleteAnalysis,
};
