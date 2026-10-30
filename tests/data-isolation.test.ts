import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Pool } from 'pg';
import { migrateIdentity } from '../src/modules/identity/setup.js';
import { migrateTicketing } from '../src/modules/ticketing/setup.js';
import { migratePayments } from '../src/modules/payments/setup.js';

test('les trois services ont des bases, roles et tables privés distincts', async () => {
  const specs = [
    { url: process.env.IDENTITY_DATABASE_URL, own: ['users'], forbidden: ['events', 'reservations', 'payment_attempts'] },
    { url: process.env.DATABASE_URL, own: ['events', 'reservations'], forbidden: ['users', 'payment_attempts'] },
    { url: process.env.PAYMENTS_DATABASE_URL, own: ['payment_attempts'], forbidden: ['users', 'events', 'reservations'] },
  ];
  const fingerprints: string[] = [];
  for (const spec of specs) {
    const pool = new Pool({ connectionString: spec.url });
    try {
      const fingerprint = (await pool.query('SELECT current_database() AS db, current_user AS role')).rows[0];
      fingerprints.push(`${fingerprint.db}/${fingerprint.role}`);
      const tables = (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")).rows.map(row => row.table_name);
      assert.deepEqual(tables, spec.own);
      for (const table of spec.forbidden) await assert.rejects(pool.query(`SELECT * FROM ${table}`), { code: '42P01' });
    } finally { await pool.end(); }
  }
  assert.equal(new Set(fingerprints).size, 3);
});

test('les migrations privées sont idempotentes et préservent les hashes des comptes', async () => {
  const identity = new Pool({ connectionString: process.env.IDENTITY_DATABASE_URL });
  const ticketing = new Pool({ connectionString: process.env.DATABASE_URL });
  const payments = new Pool({ connectionString: process.env.PAYMENTS_DATABASE_URL });
  try {
    const before = (await identity.query('SELECT * FROM users ORDER BY id')).rows;
    await migrateIdentity(identity);
    await migrateTicketing(ticketing);
    await migratePayments(payments);
    assert.deepEqual((await identity.query('SELECT * FROM users ORDER BY id')).rows, before);
  } finally { await identity.end(); await ticketing.end(); await payments.end(); }
});
