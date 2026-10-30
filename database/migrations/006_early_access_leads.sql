BEGIN;
CREATE TABLE IF NOT EXISTS early_access_leads (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
  professional_role VARCHAR(60) NOT NULL CHECK (professional_role IN ('Engineering leadership', 'Software engineering', 'DevOps / SRE', 'Technical support', 'Founder', 'Other')),
  primary_use_case VARCHAR(80) NOT NULL CHECK (primary_use_case IN ('Application errors', 'Failed deployments', 'Support escalations', 'Evaluating incident triage')),
  company VARCHAR(160),
  team_size VARCHAR(20) CHECK (team_size IN ('1–5', '6–20', '21–50', '51+')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS early_access_leads_created_at_idx ON early_access_leads(created_at);
COMMIT;
