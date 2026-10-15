# Backup, restore, migration and rollback

Never reset, clean, drop a schema, recreate volumes, or run init.sql against production to fix a migration. Protect checkpoint 74106b32d27fa24661fab41c9e0a1c60551dd210 and take a separate database backup before release. Git commits are not database backups.

Use your managed PostgreSQL provider's encrypted backups/PITR if available, with restricted access and a tested retention policy. Define recovery objectives before release; suggested initial targets (not verified guarantees) are RPO <=24 hours and RTO <=4 hours. Assign an owner, inspect the latest successful backup daily and keep one pre-migration backup until the release is stable. Store credentials in a secret manager or protected environment; never paste connection strings into tickets or captured terminal output.

Example procedure using operator-supplied variables and PostgreSQL tools of a compatible version:

```sh
# BACKUP_DATABASE_URL is the authorized source; BACKUP_FILE is a private encrypted-storage destination.
pg_dump --dbname="$BACKUP_DATABASE_URL" --format=custom --no-owner --no-acl --file="$BACKUP_FILE"
pg_restore --list "$BACKUP_FILE"
# RESTORE_DATABASE_URL MUST identify a new, isolated, empty staging database.
pg_restore --dbname="$RESTORE_DATABASE_URL" --no-owner --no-acl --exit-on-error "$BACKUP_FILE"
```

The operator must independently verify source and destination identities before running these commands. Do not use --clean. Restore never targets production during a drill. Protect dump files as sensitive production data. A successful dump/list is insufficient: connect to the restored database, verify table/row counts, sample ownership relationships without exporting content, run readiness and synthetic user smoke tests, then record recovery duration and backup age. Disable email, billing and AI delivery in the restored environment until intentionally tested so a drill cannot notify or charge real customers.

Migration:
1. Review exact git SHA, 004 and 005, role privileges, database size/locks and expected index duration. Drain analysis traffic and wait for in-flight reservations to settle. Do not mix old quota writers with this release.
2. Capture and verify backup; restore it to staging and run the exact migration CLI twice. Verify history, usage and billing fields survive, plus readiness and two-account isolation.
3. During the authorized deployment window, run `npm run migrate -- --apply` from backend using the intended migration role. Application startup never applies schema changes.
4. Deploy backend then frontend, validate configuration, readiness and smoke workflows. Retain a timestamped deployment/migration record and backup pointer without secrets.

Rollback: stop new analysis/checkouts, drain requests, restore the previous compatible application artifact/environment, and leave additive columns/tables/indexes in place. Do not roll back to pre-reservation quota logic while accepting traffic. Never reset usage or drop idempotency records. Compare ledger/checksums rather than silently modifying history. If an actual data-corruption incident requires recovery, obtain explicit owner approval, restore/PITR into a new database, verify and reconcile writes/billing events since the restore point, then authorize a controlled connection cutover. Database restoration can lose writes and is not an automatic app rollback.

No production backup, restore, PITR or cutover was executed in this hardening session. Provider backup retention, deletion propagation and alert delivery remain owner gates.
