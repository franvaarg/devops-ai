function databaseConfig(env = process.env) {
  if (!env.DATABASE_URL) {
    return { user: env.DB_USER, host: env.DB_HOST, database: env.DB_NAME,
      password: env.DB_PASSWORD, port: Number(env.DB_PORT) };
  }
  let url;
  try { url = new URL(env.DATABASE_URL); } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol.');
  }
  // pg URL parameters override Pool.ssl. Force hostname and CA verification,
  // including when an old deployment URL requests sslmode=require/disable.
  url.searchParams.delete('ssl');
  url.searchParams.delete('uselibpqcompat');
  url.searchParams.set('sslmode', 'verify-full');
  return { connectionString: url.toString() };
}
module.exports = { databaseConfig };
