import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Pool } from 'pg';

test('la migration isole les auteurs historiques et préserve les réservations authentifiées au second passage', async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  const schema = `migration_test_${randomUUID().replaceAll('-', '')}`;
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}`);
    await client.query(await readFile('db/migrations/001_init.sql', 'utf8'));
    await client.query("INSERT INTO events VALUES ('test', 'Test', 'Salle', now(), 10, 'OPEN')");
    const legacyId = randomUUID();
    await client.query("INSERT INTO reservations VALUES ($1, 'test', 'user-alice', 'PENDING', now(), now()+interval '15 minutes')", [legacyId]);
    const migration = await readFile('db/migrations/002_users.sql', 'utf8');
    await client.query(migration);
    assert.equal((await client.query('SELECT customer_ref FROM reservations WHERE id=$1', [legacyId])).rows[0].customer_ref, 'legacy:user-alice');
    const authenticatedId = randomUUID();
    await client.query("INSERT INTO reservations VALUES ($1, 'test', 'user-alice', 'PENDING', now(), now()+interval '15 minutes')", [authenticatedId]);
    await client.query(migration);
    assert.deepEqual((await client.query('SELECT customer_ref FROM reservations ORDER BY customer_ref')).rows,
      [{ customer_ref: 'legacy:user-alice' }, { customer_ref: 'user-alice' }]);
    assert.equal((await client.query('SELECT * FROM users')).rowCount, 0);
  } finally {
    await client.query('SET search_path TO public');
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    client.release();
    await pool.end();
  }
});
