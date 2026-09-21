# Backend validation

From `backend/`:

```sh
npm ci --ignore-scripts
npm test
npm run test:integration
```

Unit/API tests use mocks for external dependencies. Integration tests run actual
PostgreSQL queries, locks, constraints and transactions. Only the external AI
provider is replaced for the full HTTP workflow. No Gemini/Brevo call is made.
Four previous mocked quota tests were replaced with stronger real-database tests.

Install PostgreSQL server/client binaries and set `PG_TEST_BIN` if needed:

```sh
PG_TEST_BIN=/usr/lib/postgresql/16/bin npm run test:integration
```

The runner defaults to `/usr/lib/postgresql/18/bin` on this development machine.
Run as an ordinary user, not root (`initdb` rejects root). Docker is not required.
CI uses PostgreSQL 16, matching Compose; local execution was tested on PostgreSQL
18. The workflow has to run remotely before claiming CI/16 validation.

The runner creates a unique mode-0700 temporary directory, initializes a separate
cluster, disables TCP listening, uses a private Unix socket and creates only
`kanyi_integration_test`. It overrides DATABASE_URL/DB_* and sets NODE_ENV=test;
database modules do not load .env in test mode. The suite refuses remote/shared
connection settings. Do not add an option to point it at Neon. Local trust auth is
restricted to the temporary directory accessible to this OS user. No real
credentials are embedded. Tests stop the cluster and remove files on success or
failure; a forced kill/host crash can require manual cleanup of that test directory.

Coverage includes registration/login, reset token revocation and single use,
analysis/history isolation, quota plan enforcement, 16 simultaneous last-slot
requests, duplicate keys, failed/expired reservations, commit/replay behavior,
month allocation, migration reapplication and constraint rollback. Deployment
migrations and live providers are not exercised. No production data is read.
