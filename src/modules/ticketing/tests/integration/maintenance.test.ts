import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, beforeEach, test } from 'node:test';
import { Pool } from 'pg';
import { buildApp } from '../../../../app.js';
import { ReservationRepository } from '../../adapters/postgres/ReservationRepository.js';
import { ExpirePendingReservationsHandler } from '../../application/commands/ExpirePendingReservations.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = buildApp(pool, { reservationTtlMinutes: 15, paymentSlowMs: 1, reservationHoldMs: 0 });
beforeEach(async () => { await pool.query('TRUNCATE payment_attempts, reservations'); });
after(async () => { await app.close(); await pool.end(); });

test('la commande de maintenance expire seulement les PENDING arrivées à échéance dans PostgreSQL', async () => {
  const expiredPending = randomUUID();
  const validPending = randomUUID();
  const confirmed = randomUUID();
  const failed = randomUUID();
  const expired = randomUUID();
  for (const [id, status, deadline] of [
    [expiredPending, 'PENDING', '2000-01-01T00:00:00Z'], [validPending, 'PENDING', '2099-01-01T00:00:00Z'],
    [confirmed, 'CONFIRMED', '2000-01-01T00:00:00Z'], [failed, 'FAILED', '2000-01-01T00:00:00Z'],
    [expired, 'EXPIRED', '2000-01-01T00:00:00Z'],
  ]) {
    await pool.query('INSERT INTO reservations (id,event_id,customer_ref,status,expires_at) VALUES ($1,$2,$3,$4,$5)',
      [id, 'festival-lumieres', 'user-alice', status, deadline]);
  }
  await new ExpirePendingReservationsHandler(new ReservationRepository(pool)).execute({});
  const rows = await pool.query<{ id: string; status: string }>('SELECT id,status FROM reservations');
  assert.deepEqual(Object.fromEntries(rows.rows.map(row => [row.id, row.status])), {
    [expiredPending]: 'EXPIRED', [validPending]: 'PENDING', [confirmed]: 'CONFIRMED', [failed]: 'FAILED', [expired]: 'EXPIRED',
  });
  assert.equal((await pool.query('SELECT * FROM payment_attempts')).rowCount, 0);
});

for (const route of ['/api/events', '/api/events/festival-lumieres']) {
  test(`la route ${route} conserve l’expiration persistée du TP 4`, async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { login: 'alice', password: 'Alice-demo-2027!' } });
    assert.equal(login.statusCode, 200);
    const cookie = `ticketing_session=${login.cookies[0].value}`;
    const created = await app.inject({ method: 'POST', url: '/api/reservations', headers: { cookie }, payload: { eventId: 'festival-lumieres' } });
    assert.equal(created.statusCode, 201);
    const id = created.json().reservation.id;
    await pool.query("UPDATE reservations SET expires_at=now()-interval '1 second' WHERE id=$1", [id]);
    const response = await app.inject(route);
    assert.equal(response.statusCode, 200);
    const body = response.json();
    const event = route === '/api/events' ? body.events.find((event: { id: string }) => event.id === 'festival-lumieres') : body.event;
    assert.equal(event.available, 120);
    assert.equal((await pool.query('SELECT status FROM reservations WHERE id=$1', [id])).rows[0].status, 'EXPIRED');
  });
}
