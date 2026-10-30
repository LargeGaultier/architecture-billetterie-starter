import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { Pool } from 'pg';
import { buildApp, resetData, identityPool, paymentPool } from './helpers/system.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = buildApp(pool, { reservationTtlMinutes: 15, paymentSlowMs: 1, reservationHoldMs: 0 });

before(async () => { await app.ready(); });
let aliceCookie = '';
async function privateRequest(options: { method: 'POST' | 'GET'; url: string; payload?: Record<string, unknown> }) {
  return app.inject({ ...options, headers: { cookie: aliceCookie } });
}
beforeEach(async () => {
  await resetData(pool);
  const login = await app.inject({ method: 'POST', url: '/api/auth/login',
    payload: { login: 'alice', password: 'Alice-demo-2027!' } });
  assert.equal(login.statusCode, 200);
  aliceCookie = `ticketing_session=${login.cookies[0].value}`;
});
after(async () => { await app.close(); await pool.end(); });

test('le catalogue et la page d’accueil sont accessibles', async () => {
  const catalogue = await app.inject({ method: 'GET', url: '/api/events' });
  assert.equal(catalogue.statusCode, 200);
  const events = catalogue.json().events;
  assert.ok(events.some((event: { id: string }) => event.id === 'atelier-une-place'));
  const home = await app.inject({ method: 'GET', url: '/' });
  assert.equal(home.statusCode, 200);
  assert.match(home.body, /Billetterie/);
});

test('une réservation payée devient confirmée et occupe la place', async () => {
  const created = await privateRequest({ method: 'POST', url: '/api/reservations', payload: { eventId: 'atelier-une-place', customerRef: 'client-test' } });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().reservation.status, 'PENDING');
  const id = created.json().reservation.id;
  const paid = await privateRequest({ method: 'POST', url: `/api/reservations/${id}/checkout`, payload: { scenario: 'success' } });
  assert.equal(paid.statusCode, 200);
  assert.equal(paid.json().reservation.status, 'CONFIRMED');
  assert.equal(paid.json().paymentAttempt.status, 'SUCCEEDED');
  const state = await privateRequest({ method: 'GET', url: `/api/reservations/${id}` });
  assert.equal(state.json().reservation.paymentAttempts.length, 1);
  const event = await app.inject({ method: 'GET', url: '/api/events/atelier-une-place' });
  assert.equal(event.json().event.available, 0);
});

test('un paiement refusé libère la place', async () => {
  const first = await privateRequest({ method: 'POST', url: '/api/reservations', payload: { eventId: 'atelier-une-place', customerRef: 'client-a' } });
  const id = first.json().reservation.id;
  const denied = await privateRequest({ method: 'POST', url: `/api/reservations/${id}/checkout`, payload: { scenario: 'failure' } });
  assert.equal(denied.json().reservation.status, 'FAILED');
  const second = await privateRequest({ method: 'POST', url: '/api/reservations', payload: { eventId: 'atelier-une-place', customerRef: 'client-b' } });
  assert.equal(second.statusCode, 201);
});

test('une réponse lente conserve un état en attente', async () => {
  const created = await privateRequest({ method: 'POST', url: '/api/reservations', payload: { eventId: 'atelier-une-place', customerRef: 'client-test' } });
  const id = created.json().reservation.id;
  const checkout = await privateRequest({ method: 'POST', url: `/api/reservations/${id}/checkout`, payload: { scenario: 'slow' } });
  assert.equal(checkout.statusCode, 200);
  assert.equal(checkout.json().reservation.status, 'PENDING');
  assert.equal(checkout.json().paymentAttempt.status, 'PENDING');
});

test('une réservation expirée libère la place et ne peut plus être payée', async () => {
  const created = await privateRequest({ method: 'POST', url: '/api/reservations', payload: { eventId: 'atelier-une-place', customerRef: 'client-a' } });
  const id = created.json().reservation.id;
  await pool.query("UPDATE reservations SET expires_at = now() - interval '1 second' WHERE id = $1", [id]);
  const state = await privateRequest({ method: 'GET', url: `/api/reservations/${id}` });
  assert.equal(state.json().reservation.status, 'EXPIRED');
  const checkout = await privateRequest({ method: 'POST', url: `/api/reservations/${id}/checkout`, payload: { scenario: 'success' } });
  assert.equal(checkout.statusCode, 410);
  const next = await privateRequest({ method: 'POST', url: '/api/reservations', payload: { eventId: 'atelier-une-place', customerRef: 'client-b' } });
  assert.equal(next.statusCode, 201);
});

test('les erreurs distinguent entrée invalide, événement absent et vente complète', async () => {
  const invalid = await privateRequest({ method: 'POST', url: '/api/reservations', payload: { eventId: '', customerRef: '' } });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().error.code, 'INVALID_INPUT');
  const missing = await privateRequest({ method: 'POST', url: '/api/reservations', payload: { eventId: 'inconnu', customerRef: 'client' } });
  assert.equal(missing.statusCode, 404);
  await privateRequest({ method: 'POST', url: '/api/reservations', payload: { eventId: 'atelier-une-place', customerRef: 'client-a' } });
  const full = await privateRequest({ method: 'POST', url: '/api/reservations', payload: { eventId: 'atelier-une-place', customerRef: 'client-b' } });
  assert.equal(full.statusCode, 409);
  assert.equal(full.json().error.code, 'SOLD_OUT');
});

test('un identifiant de réservation mal formé reçoit une erreur utilisateur', async () => {
  const state = await privateRequest({ method: 'GET', url: '/api/reservations/invalide' });
  assert.equal(state.statusCode, 400);
  assert.equal(state.json().error.code, 'INVALID_INPUT');
  const checkout = await privateRequest({ method: 'POST', url: '/api/reservations/invalide/checkout', payload: { scenario: 'success' } });
  assert.equal(checkout.statusCode, 400);
  assert.equal(checkout.json().error.code, 'INVALID_INPUT');
});

test('un événement annulé est refusé sans réservation ni paiement', async () => {
  await pool.query(`INSERT INTO events (id, title, venue, starts_at, capacity, status)
    VALUES ('evenement-annule', 'Annulé', 'Salle test', now(), 10, 'CANCELLED')
    ON CONFLICT (id) DO UPDATE SET status = 'CANCELLED'`);
  const response = await privateRequest({ method: 'POST', url: '/api/reservations',
    payload: { eventId: 'evenement-annule', customerRef: 'client-test' } });
  assert.equal(response.statusCode, 409);
  assert.equal(response.json().error.code, 'EVENT_CANCELLED');
  const reservations = await pool.query('SELECT * FROM reservations');
  const attempts = await paymentPool.query('SELECT * FROM payment_attempts');
  assert.equal(reservations.rowCount, 0);
  assert.equal(attempts.rowCount, 0);
});

test('un événement affiché ouvert puis annulé est revalidé à la réservation', async () => {
  try {
    const event = await app.inject({ method: 'GET', url: '/api/events/concert-jazz' });
    assert.equal(event.json().event.status, 'OPEN');
    await pool.query("UPDATE events SET status = 'CANCELLED' WHERE id = 'concert-jazz'");
    const response = await privateRequest({ method: 'POST', url: '/api/reservations',
      payload: { eventId: 'concert-jazz', customerRef: 'client-test' } });
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, 'EVENT_CANCELLED');
    assert.equal((await pool.query('SELECT * FROM reservations')).rowCount, 0);
  } finally {
    await pool.query("UPDATE events SET status = 'OPEN' WHERE id = 'concert-jazz'");
  }
});
