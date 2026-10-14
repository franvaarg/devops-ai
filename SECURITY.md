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
insufficient-evidence diagnosis, Low severity (no supported impact), and explicit Insufficient Evidence actionability for new decision outputs. AI confidence is not a calibrated probability.
Model suggestions require human verification; KANYI does not execute remediation.
Provider calls use bounded transient retries (three attempts, 20 seconds per attempt, 45 seconds overall) and a 2048-token output budget. Hard quota and permanent errors are not retried.
Analysis failure logs omit raw provider content and exception messages.

Hosted DATABASE_URL connections require certificate and hostname verification,
even if the URL requests weaker TLS. Local DB_* configuration remains available
for Docker development. Test hosted connectivity in staging before release; do
not bypass verification to repair a certificate failure.

Current limitations: JWTs are browser-localStorage bearer credentials; logout revokes all account sessions server-side. Password reset revokes tokens. Rate limits are per process. Quota reservations now commit before provider calls;
usage and analysis persistence commit atomically. Idempotency keys prevent duplicate
usage on retries; see OPERATIONS.md for expiration, failure and billing semantics.
Backend request/provider failures use safe structured metadata instead of raw exceptions. No compliance
certification is claimed. See docs/ENGINEERING_ASSESSMENT.md for release blockers.

## Commercial product additions (2026-09-30)

New analysis inputs are limited server-side to 16 KiB text plus up to 1,500
characters of user-reported context. Both are redacted before Gemini transmission.
Context is stored inside the decision metadata and distinguished from literal
log evidence. Older data is not retroactively redacted.

Stripe checkout sends account email/customer metadata to Stripe; payment details
are collected on Stripe-hosted pages. Webhooks verify the signature against the
raw request body. Current subscription state is retrieved server-side, matched
to the persisted customer, and applied transactionally with event deduplication.
Neither frontend plan values nor return query strings grant paid capacity.
Subscription expiration independently removes Pro capacity. Checkout and portal
errors expose safe messages only. New sales are disabled by default.

Optional browser journey analytics are opt-in and send only allowlisted event
names; no log/context/email or persistent tracking ID is sent. Anonymous
subscription-activation counts are operational telemetry. Infrastructure rate
limiting/access logs may process IP addresses. Product events currently persist
until operator cleanup: decide retention and schedule deletion before launch.
See docs/COMMERCIAL_RELEASE.md for required provider, backup, legal and deployment
policies. No certification or compliance guarantees are asserted.

Operational AI usage logs contain numeric input/output/thinking token counts only
when supplied by the provider. Provider failures may log a numeric HTTP status
without the provider response body, API URL, headers, secrets, or pasted content.
These counts support cost measurement independently of optional funnel analytics.

Sign out now increments the account token version server-side, revoking bearer
sessions on all devices. A failed revocation is shown as an error rather than
claiming successful logout. JWT verification permits HS256 only and validates
numeric account/version claims before SQL. Registration and password reset reject
passwords above bcrypt's 72 UTF-8 byte limit, matching login. Existing overlong
passwords require password recovery; stored hashes are not modified. Email input
is bounded to the existing 150-character database column.
