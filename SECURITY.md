# Security and data handling

KANYI sends submitted logs to Google Gemini to generate analysis. New submissions
are passed through best-effort credential redaction before provider transmission
and PostgreSQL storage. Common credentials, authorization/cookie values, private
keys and credential-bearing URLs are covered; arbitrary secrets and personal data
may remain. Remove sensitive information before submission. Historical records
are not rewritten. Users can delete individual analyses through their history.

Model JSON is validated for fields, types, enums and bounds. Evidence must be a
literal excerpt from the submitted redacted log. This checks provenance, not
causation or diagnostic correctness. No evidence forces low confidence and an
insufficient-evidence diagnosis. AI confidence is not a calibrated probability.
Model suggestions require human verification; KANYI does not execute remediation.
Provider calls use a 30-second SDK timeout, one attempt and a bounded output budget.
Analysis failure logs omit raw provider content and exception messages.

Hosted DATABASE_URL connections require certificate and hostname verification,
even if the URL requests weaker TLS. Local DB_* configuration remains available
for Docker development. Test hosted connectivity in staging before release; do
not bypass verification to repair a certificate failure.

Current limitations: JWTs are browser-localStorage bearer credentials; logout is
local only. Password reset revokes tokens. Rate limits are per process. Quota reservations now commit before provider calls;
usage and analysis persistence commit atomically. Idempotency keys prevent duplicate
usage on retries; see OPERATIONS.md for expiration, failure and billing semantics.
Backend request/provider failures use safe structured metadata instead of raw exceptions. No compliance
certification is claimed. See docs/ENGINEERING_ASSESSMENT.md for release blockers.
