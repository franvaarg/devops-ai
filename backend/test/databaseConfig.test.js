const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { databaseConfig } = require('../src/database/config');
test('hosted database URLs cannot disable certificate or hostname verification', () => {
  for (const query of ['', '?sslmode=require', '?sslmode=disable&ssl=0&uselibpqcompat=true']) {
    const client = new Client(databaseConfig({ DATABASE_URL: `postgresql://user:secret@db.example/app${query}` }));
    assert.notEqual(client.connectionParameters.ssl, false);
    assert.notEqual(client.connectionParameters.ssl.rejectUnauthorized, false);
    assert.equal(client.connectionParameters.ssl.checkServerIdentity, undefined);
  }
});
test('local DB parameters remain compatible and invalid URLs do not expose credentials', () => {
  assert.equal(databaseConfig({ DB_HOST: 'localhost', DB_PORT: '5432' }).host, 'localhost');
  assert.throws(() => databaseConfig({ DATABASE_URL: 'bad secret' }), { message: 'DATABASE_URL must be a valid PostgreSQL URL.' });
});
