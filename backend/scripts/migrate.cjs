// Explicit, forward-only application of checked-in, additive migrations.
require('dotenv').config({quiet:true});
const { readFileSync, readdirSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { createHash } = require('node:crypto');
const { Pool } = require('pg');
const { databaseConfig } = require('../src/database/config');
async function main() {
 if (!process.argv.includes('--apply')) throw new Error('Review a backup and migration SQL, then run npm run migrate -- --apply. No migration has run.');
 const pool = new Pool({...databaseConfig(),max:1,connectionTimeoutMillis:5000,statement_timeout:60000});
 let client;
 try {
  client=await pool.connect();
  // Fail rather than hanging if another deploy is applying schema changes.
  const lock=await client.query('SELECT pg_try_advisory_lock(186293714) AS acquired');
  if(!lock.rows[0].acquired) throw new Error('Another migration process holds the migration lock.');
  await client.query("SET lock_timeout='5s'");
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const dir=resolve(__dirname,'../../database/migrations');
  for(const name of readdirSync(dir).filter(n=>/^\d+_[a-z0-9_]+\.sql$/.test(n)).sort()) {
   const sql=readFileSync(join(dir,name),'utf8'); const checksum=createHash('sha256').update(sql).digest('hex');
   const prior=await client.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);
   if(prior.rows.length) {
    if(prior.rows[0].checksum!==checksum) throw new Error(`Migration checksum differs: ${name}. Review manually; do not overwrite migration history.`);
    continue;
   }
   await client.query(sql);
   await client.query('INSERT INTO schema_migrations(name,checksum) VALUES ($1,$2)',[name,checksum]);
   console.log(`Applied ${name}`);
  }
 } finally {
  if(client) { try { await client.query('ROLLBACK'); await client.query('SELECT pg_advisory_unlock(186293714)'); } finally { client.release(); } }
  await pool.end();
 }
}
main().catch(()=>{console.error('Migration failed. Review connectivity, permissions, SQL, checksums and database logs. No automatic rollback or reset was attempted.');process.exitCode=1});
