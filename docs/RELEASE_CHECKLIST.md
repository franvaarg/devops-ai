# Release checklist

Pre-deploy:
- Preserve checkpoint 74106b32d27fa24661fab41c9e0a1c60551dd210. Review `git status`, diff and intended release SHA; create a reviewed release commit with no secrets. Do not discard unrelated work.
- Run `node scripts/release-check.cjs` and archive output. Run browser desktop/mobile and accessibility checks. Inspect full dependency advisories; audits are point-in-time checks.
- Run real synthetic AI evaluation and human review; do not infer accuracy from mocks. Validate recovery email delivery, reset expiry/reuse, two-account isolation, quota and bounded failure recovery.
- Validate production environment without printing secrets, migration SQL/ledger and DB privileges. Take a backup, restore to isolated staging and record verification/duration.
- Keep billing off until real Stripe test-mode lifecycle, webhook retries, portal and payment failure/cancellation/expiry are verified. Confirm business/payment eligibility and owner-approved price/cost budget.
- Configure support identity, terms/privacy, log/provider/backup retention and tested alert destinations. Check platform termination grace and single-instance rate-limit assumption.

Deploy:
- Drain admitted analysis/billing work; allow abandoned reservations to expire. Do not run destructive operations.
- Apply forward migrations under the migration role. Deploy backend, validate production startup and /health/ready, then frontend with exact API origin.
- Verify domain/TLS/CORS/proxy/header behavior and actual deployed SHA. Retain prior compatible artifact and backup pointer.

Post-deploy:
- Use dedicated synthetic users: landing, signup/login/logout, real recovery email, first analysis, upload, structured evidence/unknowns/verification, history/PDF/delete, expiry and other-user denial. Verify quota and billing disabled/enabled as intended.
- Inspect request IDs, provider latency/errors, HTTP 5xx, DB errors, quota release failures and Stripe deliveries. Verify an intentional failure reaches the configured alert destination.
- Reopen traffic gradually only after evidence supports it. A successful readiness probe is not a full smoke test.

Rollback:
- Stop new analysis/checkouts; drain; redeploy prior compatible artifact/environment; retain additive schema and request/usage history. Verify readiness and two-account smoke tests.
- Data recovery requires separate explicit approval and restore/PITR to a new target before cutover; reconcile post-backup writes and billing events. No automatic reset/down-migration.

First 24 hours: check liveness/readiness, 5xx and request latency; provider success/failure and cost; stuck reservations; DB locks/connections; signup/reset delivery; quota accuracy; Stripe delivery/retries; support requests and backup success. Rehearse disabling sales and preserve portal cancellation access.

First 7 days: review every reported wrong diagnosis and a redacted sample of consented synthetic evaluation output; inspect false positives and human usefulness; rerun fixtures after model/prompt changes; verify backup restore and retention jobs; inspect dependency updates, provider budget, abuse limits, cancellation/downgrade, refunds/support and missed webhook reconciliation. Reassess pricing with observed costs before expanding paid access.
