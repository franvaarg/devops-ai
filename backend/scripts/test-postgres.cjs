// Runs only an ephemeral cluster created by this process. Never reads DATABASE_URL.
const { mkdtempSync, rmSync, readFileSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const dir = mkdtempSync(join(tmpdir(), 'kanyi-pg-test-'));
const bin = process.env.PG_TEST_BIN || '/usr/lib/postgresql/18/bin';
let started = false;
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 60000, ...options });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.error || result.stdout}`);
  return result;
}
try {
  if (!existsSync(join(bin, 'initdb'))) throw new Error('Install PostgreSQL server binaries and set PG_TEST_BIN to their directory.');
  run(join(bin, 'initdb'), ['-D', join(dir, 'data'), '-U', 'kanyi_test', '--auth=trust', '--no-locale', '--encoding=UTF8']);
  // Private Unix socket directory; TCP disabled. No production or external network.
  run(join(bin, 'pg_ctl'), ['-D', join(dir, 'data'), '-l', join(dir, 'postgres.log'), '-o', `-k ${dir} -h '' -p 55439 -F`, '-w', 'start']);
  started = true;
  run(join(bin, 'createdb'), ['-h', dir, '-p', '55439', '-U', 'kanyi_test', 'kanyi_integration_test']);
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: '', DB_HOST: dir, DB_PORT: '55439', DB_USER: 'kanyi_test', DB_PASSWORD: '', DB_NAME: 'kanyi_integration_test', PGOPTIONS: '', PGSERVICE: '', PGSSLMODE: 'disable',
    KANYI_EPHEMERAL_TEST_DIR: dir, JWT_SECRET: randomBytes(32).toString('hex'), GEMINI_API_KEY: 'test-placeholder', BREVO_API_KEY: '', CORS_ORIGINS: '', TRUST_PROXY_HOPS: '' };
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'integration/postgres.test.cjs'], { cwd: resolve(__dirname, '..'), env, stdio: 'inherit', timeout: 120000 });
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  if (existsSync(join(dir, 'postgres.log'))) console.error(readFileSync(join(dir, 'postgres.log'), 'utf8'));
  process.exitCode = 1;
} finally {
  if (started) {
    try { run(join(bin, 'pg_ctl'), ['-D', join(dir, 'data'), '-m', 'immediate', '-w', 'stop']); }
    catch { process.exitCode = 1; }
  }
  rmSync(dir, { recursive: true, force: true });
}
