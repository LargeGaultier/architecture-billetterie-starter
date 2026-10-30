import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { Pool } from 'pg';
import { buildApp, resetData, identityPool, paymentPool } from './helpers/system.js';
import { PaymentSimulator } from '../src/integrations/PaymentSimulator.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let now = Date.now();
const config = { reservationTtlMinutes: 15, paymentSlowMs: 1, reservationHoldMs: 0 };
const app = buildApp(pool, config, { now: () => now, sessionTtlMs: 30 * 60_000 });
before(async () => { await app.ready(); });
beforeEach(async () => {
  now = Date.now();
  await resetData(pool);
});
after(async () => { await app.close(); await pool.end(); });

async function login(name = 'alice') {
  const response = await app.inject({ method: 'POST', url: '/api/auth/login',
    payload: { login: name, password: name === 'alice' ? 'Alice-demo-2027!' : 'Bob-demo-2027!' } });
  assert.equal(response.statusCode, 200);
  const cookie = response.cookies.find(cookie => cookie.name === 'ticketing_session');
  assert.ok(cookie);
  return { response, cookie: `ticketing_session=${cookie.value}`, user: response.json().user };
}

async function reserve(cookie: string) {
  const response = await app.inject({ method: 'POST', url: '/api/reservations', headers: { cookie },
    payload: { eventId: 'festival-lumieres' } });
  assert.equal(response.statusCode, 201);
  return response.json().reservation;
}

async function snapshot() {
  return {
    reservations: (await pool.query('SELECT * FROM reservations ORDER BY id')).rows,
    attempts: (await paymentPool.query('SELECT * FROM payment_attempts ORDER BY id')).rows,
  };
}

test('le catalogue reste public, réserver sans session répond 401 sans effet', async () => {
  assert.equal((await app.inject('/api/events')).statusCode, 200);
  assert.equal((await app.inject('/api/events/atelier-une-place')).statusCode, 200);
  const before = await snapshot();
  const response = await app.inject({ method: 'POST', url: '/api/reservations',
    payload: { eventId: 'atelier-une-place', customerRef: 'user-alice', userId: 'user-alice' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'AUTH_REQUIRED');
  assert.deepEqual(await snapshot(), before);
});

test('la vraie connexion crée un cookie opaque protégé et expose seulement le compte public', async () => {
  const alice = await login();
  assert.deepEqual(alice.user, { id: 'user-alice', login: 'alice' });
  assert.deepEqual(Object.keys(alice.response.json()), ['user']);
  assert.notEqual(alice.cookie, 'ticketing_session=user-alice');
  const cookieHeader = String(alice.response.headers['set-cookie']);
  assert.match(cookieHeader, /HttpOnly/i);
  assert.match(cookieHeader, /SameSite=Lax/i);
  assert.match(cookieHeader, /Path=\//i);
  assert.doesNotMatch(cookieHeader, /; Secure/i);
  assert.match(cookieHeader, /Max-Age=1800/i);
  const me = await app.inject({ url: '/api/auth/me', headers: { cookie: alice.cookie } });
  assert.equal(me.statusCode, 200);
  assert.deepEqual(me.json(), { user: alice.user });
  const second = await login();
  assert.notEqual(second.cookie, alice.cookie);
});

test('un mauvais mot de passe, un compte inconnu et des entrées invalides ne créent pas de cookie', async () => {
  for (const payload of [
    { login: 'alice', password: 'incorrect' }, { login: 'inconnu', password: 'incorrect' },
    { login: '', password: '' }, { login: [], password: {} },
  ]) {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload });
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'INVALID_CREDENTIALS');
    assert.equal(response.headers['set-cookie'], undefined);
  }
  assert.equal((await app.inject('/api/auth/me')).statusCode, 401);
});

test('Alice réserve et paie avec son identité malgré un auteur forgé', async () => {
  const alice = await login();
  const bob = await login('bob');
  const created = await app.inject({ method: 'POST', url: '/api/reservations', headers: { cookie: alice.cookie },
    payload: { eventId: 'atelier-une-place', customerRef: bob.user.id, userId: bob.user.id } });
  assert.equal(created.statusCode, 201);
  const reservation = created.json().reservation;
  assert.equal(reservation.customerRef, alice.user.id);
  assert.equal((await pool.query('SELECT customer_ref FROM reservations WHERE id=$1', [reservation.id])).rows[0].customer_ref, 'user-alice');
  const paid = await app.inject({ method: 'POST', url: `/api/reservations/${reservation.id}/checkout`,
    headers: { cookie: alice.cookie }, payload: { scenario: 'success', userId: bob.user.id } });
  assert.equal(paid.statusCode, 200);
  assert.equal(paid.json().reservation.status, 'CONFIRMED');
  assert.equal(paid.json().paymentAttempt.status, 'SUCCEEDED');
});

test('Bob ne peut ni consulter ni payer la réservation Alice, sans mutation ni appel au paiement', async context => {
  const alice = await login();
  const bob = await login('bob');
  const reservation = await reserve(alice.cookie);
  // Même expirée, une réservation étrangère ne doit pas être modifiée par le refus.
  await pool.query("UPDATE reservations SET expires_at=now()-interval '1 second' WHERE id=$1", [reservation.id]);
  const before = await snapshot();
  const payment = context.mock.method(PaymentSimulator.prototype, 'run');
  for (const method of ['GET', 'POST'] as const) {
    const response = await app.inject({ method,
      url: `/api/reservations/${reservation.id}${method === 'POST' ? '/checkout' : ''}`,
      headers: { cookie: bob.cookie }, ...(method === 'POST' ? { payload: { scenario: 'success', customerRef: alice.user.id } } : {}) });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, 'RESERVATION_FORBIDDEN');
    assert.deepEqual(await snapshot(), before);
  }
  assert.equal(payment.mock.callCount(), 0);
});

test('cookie absent, falsifié ou égal au userId : toutes les routes privées refusent sans effet', async context => {
  const alice = await login();
  const reservation = await reserve(alice.cookie);
  const before = await snapshot();
  const payment = context.mock.method(PaymentSimulator.prototype, 'run');
  for (const cookie of ['', `${alice.cookie}x`, 'ticketing_session=user-alice', 'ticketing_session=%ZZ']) {
    for (const [method, url] of [
      ['GET', '/api/auth/me'], ['POST', '/api/reservations'],
      ['GET', `/api/reservations/${reservation.id}`], ['POST', `/api/reservations/${reservation.id}/checkout`],
    ] as const) {
      const response = await app.inject({ method, url, headers: { cookie },
        ...(method === 'POST' ? { payload: { eventId: 'festival-lumieres', scenario: 'success' } } : {}) });
      assert.equal(response.statusCode, 401);
      assert.equal(response.json().error.code, 'AUTH_REQUIRED');
    }
  }
  assert.deepEqual(await snapshot(), before);
  assert.equal(payment.mock.callCount(), 0);
});

test('la session expire au seuil exact sans attente réelle ni paiement', async context => {
  const alice = await login();
  const reservation = await reserve(alice.cookie);
  now += 30 * 60_000 - 1;
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: alice.cookie } })).statusCode, 200);
  now += 1;
  const before = await snapshot();
  const payment = context.mock.method(PaymentSimulator.prototype, 'run');
  const response = await app.inject({ method: 'POST', url: `/api/reservations/${reservation.id}/checkout`,
    headers: { cookie: alice.cookie }, payload: { scenario: 'success' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, 'AUTH_REQUIRED');
  assert.deepEqual(await snapshot(), before);
  assert.equal(payment.mock.callCount(), 0);
});

test('la déconnexion invalide côté serveur, efface le cookie et préserve les autres sessions', async () => {
  const alice = await login();
  const bob = await login('bob');
  const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: alice.cookie } });
  assert.equal(logout.statusCode, 204);
  assert.equal(logout.body, '');
  assert.match(String(logout.headers['set-cookie']), /ticketing_session=;/);
  assert.match(String(logout.headers['set-cookie']), /Expires=Thu, 01 Jan 1970/);
  const expired = await app.inject({ url: '/api/auth/me', headers: { cookie: alice.cookie } });
  assert.equal(expired.statusCode, 401);
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: bob.cookie } })).statusCode, 200);
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/logout' })).statusCode, 204);
});

test('les deux comptes persistés ont des hashes salés distincts, jamais leurs mots de passe', async () => {
  const users = await identityPool.query('SELECT id, login, password_hash FROM users ORDER BY login');
  assert.equal(users.rowCount, 2);
  for (const user of users.rows) {
    assert.match(user.password_hash, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    assert.doesNotMatch(user.password_hash, /demo-2027/);
  }
  assert.notEqual(users.rows[0].password_hash.split('$')[1], users.rows[1].password_hash.split('$')[1]);
});

test('une configuration HTTPS ajoute Secure au cookie', async () => {
  const secureApp = buildApp(pool, config, { secureCookies: true });
  try {
    const response = await secureApp.inject({ method: 'POST', url: '/api/auth/login',
      payload: { login: 'alice', password: 'Alice-demo-2027!' } });
    assert.equal(response.statusCode, 200);
    assert.match(String(response.headers['set-cookie']), /; Secure/i);
  } finally { await secureApp.close(); }
});
