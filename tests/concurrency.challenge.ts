import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Pool } from 'pg';
import { buildApp, resetData, identityPool, paymentPool } from './helpers/system.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = buildApp(pool, { reservationTtlMinutes: 15, paymentSlowMs: 1, reservationHoldMs: 120 });
before(async () => {
  await app.ready();
  await resetData(pool);
});
after(async () => { await app.close(); await pool.end(); });

test('une seule demande doit occuper la dernière place', async () => {
  const cookies = await Promise.all(['alice', 'bob'].map(async login => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login',
      payload: { login, password: login === 'alice' ? 'Alice-demo-2027!' : 'Bob-demo-2027!' } });
    assert.equal(response.statusCode, 200);
    return `ticketing_session=${response.cookies[0].value}`;
  }));
  const requests = cookies.map(cookie => app.inject({
    method: 'POST', url: '/api/reservations',
    headers: { cookie }, payload: { eventId: 'atelier-une-place' },
  }));
  const responses = await Promise.all(requests);
  const accepted = responses.filter(response => response.statusCode === 201).length;
  assert.ok(responses.every(response => [201, 409].includes(response.statusCode)), 'Les demandes authentifiées doivent atteindre la décision de capacité.');
  const result = await pool.query<{ active: number }>(
    "SELECT count(*)::int AS active FROM reservations WHERE event_id = 'atelier-une-place' AND status IN ('PENDING','CONFIRMED')",
  );
  assert.ok(result.rows[0].active <= 1, `Deux demandes ont été acceptées (${accepted}) pour une seule place.`);
});
