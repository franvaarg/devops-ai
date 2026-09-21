# Change log

## Unreleased

### Operational reliability milestone

- Reserve analysis capacity durably before AI calls; atomically commit analysis,
  usage and idempotency completion. Release failures and expire crash reservations.
- Add migration 003 without rewriting existing usage/history. Drain old analysis
  writers for rollout; see OPERATIONS.md.
- Return safe structured errors and correlation IDs; log HTTP/provider latency,
  auth outcomes and storage/quota/email failures without request content.
- Harden Brevo redirects and response cleanup; preserve bounded provider attempts.
- Add disposable real PostgreSQL integration tests and a validation CI workflow.
- Reuse browser request keys on ambiguous in-session retries.

### Initial security milestone

- Audit and prioritized incident-response product roadmap recorded.
- Redact common credentials before AI analysis and new log storage; disclose
  provider transmission and detection limitations in the analysis form.
- Validate AI response shape, bounds, enums and literal evidence provenance.
  Reject invalid responses without logging their contents; use low confidence
  when no evidence is returned. Limit provider time, attempts and output.
- Require verified TLS for hosted PostgreSQL URLs. Staging connectivity must be
  checked before deployment; existing insecure certificate configurations fail closed.
- Update vulnerable transitive dependencies within existing constraints.

No schema changes. Existing records are preserved. Rolling back privacy changes
would resume raw-log transmission/storage and is not a safe privacy workaround;
disable analysis temporarily if the new boundary causes production failures.
