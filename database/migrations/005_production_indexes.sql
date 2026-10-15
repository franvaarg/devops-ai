BEGIN;
-- Additive and rerunnable. Normal index creation can briefly block writers;
-- schedule a maintenance window or prebuild CONCURRENTLY for a large table.
CREATE INDEX IF NOT EXISTS idx_analyses_user_id_desc ON analyses(user_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_analysis ON analysis_requests(analysis_id) WHERE analysis_id IS NOT NULL;
COMMIT;
