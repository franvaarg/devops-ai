BEGIN;
CREATE TABLE IF NOT EXISTS analysis_requests (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_key VARCHAR(128) NOT NULL,
    input_hash CHAR(64) NOT NULL,
    period_start DATE NOT NULL,
    status VARCHAR(12) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    analysis_id INTEGER REFERENCES analyses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, request_key),
    FOREIGN KEY (user_id, period_start) REFERENCES monthly_usage(user_id, period_start) ON DELETE CASCADE,
    CHECK (status = 'completed' OR analysis_id IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_pending
ON analysis_requests(user_id, period_start, expires_at) WHERE status = 'pending';
COMMIT;
