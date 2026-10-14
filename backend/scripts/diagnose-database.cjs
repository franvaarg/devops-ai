// Read-only; remote access requires an explicit operator --allow-remote flag.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const { databaseConfig } = require('../src/database/config');
async function main() {
  const useLocal = process.argv.includes('--local');
  const config = databaseConfig(useLocal ? { ...process.env, DATABASE_URL: '' } : process.env);
  const host = config.connectionString ? new URL(config.connectionString).hostname : config.host;
  const local = ['localhost', '127.0.0.1', '::1', 'database'].includes(host) || host?.startsWith('/');
  if (!local && !process.argv.includes('--allow-remote')) {
    console.log(JSON.stringify({ status: 'OWNER ACTION REQUIRED', code: 'REMOTE_ACCESS_NOT_AUTHORIZED', databaseUrlTakesPrecedence: !useLocal && !!process.env.DATABASE_URL, source: useLocal ? 'DB_* explicit local override' : 'configured default' }));
    process.exitCode = 1; return;
  }
  const client = new Client({ ...config, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const result = await client.query(`SELECT
      to_regclass('public.users') IS NOT NULL AS users,
      to_regclass('public.analyses') IS NOT NULL AS analyses,
      to_regclass('public.monthly_usage') IS NOT NULL AS monthly_usage,
      to_regclass('public.analysis_requests') IS NOT NULL AS analysis_requests,
      to_regclass('public.password_reset_tokens') IS NOT NULL AS password_reset_tokens,
      to_regclass('public.billing_events') IS NOT NULL AS billing_events,
      to_regclass('public.product_events') IS NOT NULL AS product_events`);
    await client.query('ROLLBACK');
    const schema = result.rows[0];
    console.log(JSON.stringify({ status: Object.values(schema).every(Boolean) ? 'CONNECTED' : 'MIGRATIONS_REQUIRED', readOnly: true, schema, databaseUrlTakesPrecedence: !useLocal && !!process.env.DATABASE_URL, source: useLocal ? 'DB_* explicit local override' : 'configured default' }));
    if (!Object.values(schema).every(Boolean)) process.exitCode = 1;
  } catch (error) {
    const known = ['28P01', '28000', '3D000', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'ERR_TLS_CERT_ALTNAME_INVALID'];
    console.log(JSON.stringify({ status: 'NOT READY', code: known.includes(error.code) ? error.code : 'DATABASE_CONNECTION_FAILED', readOnly: true, databaseUrlTakesPrecedence: !useLocal && !!process.env.DATABASE_URL, source: useLocal ? 'DB_* explicit local override' : 'configured default' }));
    process.exitCode = 1;
  } finally { await client.end().catch(() => {}); }
}
main().catch(() => { console.log(JSON.stringify({ status: 'NOT READY', code: 'DATABASE_CONFIGURATION_INVALID' })); process.exitCode = 1; });
