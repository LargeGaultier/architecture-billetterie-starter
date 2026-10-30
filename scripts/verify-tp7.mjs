import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

// À lancer après compose up. Les services sont rétablis même après une assertion.
const composeFile = resolve(process.env.TP7_COMPOSE_FILE ?? 'compose.yaml');
const project = process.env.TP7_PROJECT ?? 'architecture-billetterie-starter';
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const compose = (...args) => execFileSync('docker', ['compose', '-f', composeFile, '-p', project, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
const config = JSON.parse(compose('config', '--format', 'json'));
for (const service of ['identity', 'ticketing', 'payments', 'gateway']) assert.ok(config.services[service], 'Mauvais projet Compose TP7.');
function inspect(service) {
  const id = compose('ps', '-aq', service).trim();
  assert.ok(id && !id.includes('\n'), 'Un seul conteneur attendu pour ' + service);
  const container = JSON.parse(execFileSync('docker', ['inspect', id], { encoding: 'utf8' }))[0];
  assert.equal(container.Config.Labels['com.docker.compose.project'], project);
  assert.equal(container.Config.Labels['com.docker.compose.service'], service);
  return container;
}
async function healthy(service) {
  for (let n = 0; n < 50; n++) {
    if (inspect(service).State.Health?.Status === 'healthy') return;
    await sleep(200);
  }
  assert.fail(service + ' ne revient pas sain.');
}
async function request(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  return fetch(base + path, { method, headers: { ...headers,
    ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(cookie ? { cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(12000) });
}
async function login(name) {
  const response = await request('/api/auth/login', { method: 'POST', body: { login: name, password: name === 'alice' ? 'Alice-demo-2027!' : 'Bob-demo-2027!' } });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';')[0];
}
async function reserve(cookie) {
  const response = await request('/api/reservations', { method: 'POST', cookie,
    headers: { 'x-actor-id': 'user-bob', 'x-user-id': 'user-bob' }, body: { eventId: 'festival-lumieres', customerRef: 'user-bob', actorId: 'user-bob' } });
  assert.equal(response.status, 201);
  const reservation = (await response.json()).reservation;
  assert.equal(reservation.customerRef, 'user-alice');
  return reservation.id;
}

const evidence = {};
const stopped = new Set();
try {
  assert.equal((await request('/health')).status, 200);
  const catalogue = await request('/api/events');
  assert.equal(catalogue.status, 200);
  evidence.catalogue = (await catalogue.json()).events.length;
  assert.equal((await request('/api/reservations', { method: 'POST', body: { eventId: 'festival-lumieres', actorId: 'user-alice' }, headers: { 'x-actor-id': 'user-alice' } })).status, 401);
  let alice = await login('alice');
  const bob = await login('bob');
  const id = await reserve(alice);
  for (const method of ['GET', 'POST']) {
    const response = await request(`/api/reservations/${id}${method === 'POST' ? '/checkout' : ''}`, {
      method, cookie: bob, ...(method === 'POST' ? { body: { scenario: 'success' } } : {}),
    });
    assert.equal(response.status, 403);
  }
  const paid = await request(`/api/reservations/${id}/checkout`, { method: 'POST', cookie: alice, body: { scenario: 'success' } });
  assert.equal(paid.status, 200);
  const result = await paid.json();
  assert.equal(result.reservation.status, 'CONFIRMED');
  assert.equal(result.paymentAttempt.status, 'SUCCEEDED');
  evidence.nominal = { reservation: result.reservation.status, paiement: result.paymentAttempt.status, sansSession: 401, bob: 403, auteurForgeIgnore: true };
  evidence.scenarios = {};
  for (const [scenario, reservationStatus, paymentStatus] of [['failure', 'FAILED', 'FAILED'], ['slow', 'PENDING', 'PENDING']]) {
    const scenarioId = await reserve(alice);
    const response = await request(`/api/reservations/${scenarioId}/checkout`, { method: 'POST', cookie: alice, body: { scenario } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.reservation.status, reservationStatus);
    assert.equal(body.paymentAttempt.status, paymentStatus);
    evidence.scenarios[scenario] = { reservation: reservationStatus, paiement: paymentStatus };
  }

  // Les réseaux de données sont propres à leur service, sans port DB publié.
  const gateway = inspect('gateway');
  assert.ok(!gateway.Config.Env.some(item => item.startsWith('DATABASE_URL=')));
  for (const name of ['identity', 'ticketing', 'payments']) {
    const db = inspect(name + '-db');
    assert.equal(Object.values(db.NetworkSettings.Ports ?? {}).filter(Boolean).length, 0);
    const dbNetworks = Object.keys(db.NetworkSettings.Networks);
    assert.equal(dbNetworks.length, 1);
    for (const other of ['gateway', 'identity', 'ticketing', 'payments'].filter(value => value !== name)) {
      assert.ok(!Object.hasOwn(inspect(other).NetworkSettings.Networks, dbNetworks[0]), other + ' accède au réseau privé de ' + name);
    }
  }
  evidence.isolation = 'Trois bases, réseaux privés distincts et aucun port SQL publié ; gateway sans connexion SQL';

  const identityStarted = inspect('identity').State.StartedAt;
  const ticketingStarted = inspect('ticketing').State.StartedAt;
  stopped.add('payments');
  compose('stop', 'payments');
  assert.equal((await request('/api/events')).status, 200);
  const waiting = await reserve(alice);
  assert.equal((await request(`/api/reservations/${waiting}`, { cookie: bob })).status, 403);
  assert.equal((await request(`/api/reservations/${waiting}`, { cookie: alice })).status, 503);
  assert.equal((await request(`/api/reservations/${waiting}/checkout`, { method: 'POST', cookie: alice, body: { scenario: 'success' } })).status, 503);
  evidence.paiementCoupe = { catalogue: 200, reservation: 201, bob: 403, historique: 503, achat: 503 };
  compose('up', '--no-deps', '-d', '--wait', 'payments');
  stopped.delete('payments');
  assert.equal(inspect('identity').State.StartedAt, identityStarted);
  assert.equal(inspect('ticketing').State.StartedAt, ticketingStarted);
  const history = await request(`/api/reservations/${id}`, { cookie: alice });
  assert.equal(history.status, 200);
  assert.equal((await history.json()).reservation.paymentAttempts[0].status, 'SUCCEEDED');
  evidence.reprisePaiement = 'Historique persistant, session valide et autres processus non redémarrés';

  compose('restart', 'identity');
  await healthy('identity');
  assert.equal((await request('/api/auth/me', { cookie: alice })).status, 401);
  assert.equal((await request(`/api/reservations/${id}`, { cookie: alice })).status, 401);
  assert.equal((await request('/api/events')).status, 200);
  alice = await login('alice');
  assert.equal((await request(`/api/reservations/${id}`, { cookie: alice })).status, 200);
  evidence.repriseIdentite = 'Ancienne session perdue (401), compte et réservation conservés, nouvelle connexion réussie';

  stopped.add('identity');
  compose('stop', 'identity');
  assert.equal((await request('/api/events')).status, 200);
  assert.equal((await request('/api/reservations', { method: 'POST', cookie: alice, body: { eventId: 'festival-lumieres' } })).status, 503);
  assert.equal((await request('/api/reservations', { method: 'POST', body: { eventId: 'festival-lumieres' } })).status, 401);
  evidence.identiteCoupee = { catalogue: 200, sessionAVerifier: 503, sansSession: 401 };
  compose('up', '--no-deps', '-d', '--wait', 'identity');
  stopped.delete('identity');
  alice = await login('alice');
  assert.equal((await request('/api/auth/logout', { method: 'POST', cookie: alice })).status, 204);
  assert.equal((await request('/api/auth/me', { cookie: alice })).status, 401);
  evidence.deconnexion = { logout: 204, ancienCookie: 401 };
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  for (const service of stopped) compose('up', '--no-deps', '-d', '--wait', service);
}
