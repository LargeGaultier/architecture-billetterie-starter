import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { createHttpApp } from '../../src/shared/adapters/http/createHttpApp.js';
import { buildPaymentsHttpApp } from '../../src/modules/payments/index.js';
import { PaymentHttpClient, createSessionActor } from '../../src/modules/ticketing/index.js';
import { buildGatewayApp } from '../../src/adapters/http/buildGatewayApp.js';

const token = 'tp7-contract-service-secret-at-least-32';
const id = '11111111-1111-4111-8111-111111111111';
const attempt = { id: '22222222-2222-4222-8222-222222222222', reservationId: id, scenario: 'success', status: 'SUCCEEDED', createdAt: '2027-01-01T00:00:00.000Z' };
async function listen(app: FastifyInstance) { return app.listen({ host: '127.0.0.1', port: 0 }); }

test('le contrat Paiement refuse un secret absent/incorrect avant toute commande', async () => {
  let calls = 0;
  const app = buildPaymentsHttpApp({ commands: { processPayment: { async execute() { calls++; return attempt as never; } } },
    queries: { listPaymentAttempts: { async execute() { calls++; return []; } } } }, token, async () => {});
  try {
    const url = await listen(app);
    for (const secret of ['', 'forged']) {
      const response = await fetch(url + '/internal/payments', { method: 'POST', headers: { 'content-type': 'application/json', 'x-service-token': secret }, body: JSON.stringify({ reservationId: id, scenario: 'success' }) });
      assert.equal(response.status, 401);
    }
    assert.equal(calls, 0);
    const client = new PaymentHttpClient(url, token, 1000);
    assert.deepEqual(await client.pay(id, 'success'), attempt);
    assert.deepEqual(await client.listForReservation(id), []);
    assert.equal(calls, 2);
  } finally { await app.close(); }
});

for (const returned of [null, { ...attempt, status: 'UNKNOWN' }, { ...attempt, reservationId: '33333333-3333-4333-8333-333333333333' },
  { ...attempt, scenario: 'failure' }, { ...attempt, createdAt: 'bad' }, { ...attempt, id: 'bad' }]) {
  test(`le client refuse un contrat Paiement invalide ou non corrélé : ${JSON.stringify(returned)}`, async () => {
    const app = createHttpApp(async () => {});
    app.post('/internal/payments', async () => ({ paymentAttempt: returned }));
    try { await assert.rejects(new PaymentHttpClient(await listen(app), token, 1000).pay(id, 'success')); }
    finally { await app.close(); }
  });
}

test('la lecture historique refuse une tentative appartenant à une autre réservation', async () => {
  const app = createHttpApp(async () => {});
  app.get('/internal/reservations/:id/payments', async () => ({ paymentAttempts: [{ ...attempt, reservationId: '33333333-3333-4333-8333-333333333333' }] }));
  try { await assert.rejects(new PaymentHttpClient(await listen(app), token, 1000).listForReservation(id)); }
  finally { await app.close(); }
});

test('le timeout borne un paiement lent et ne le relance pas, même si le serveur finit ensuite', async () => {
  const app = createHttpApp(async () => {});
  let calls = 0;
  let persisted = false;
  app.post('/internal/payments', async () => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 150));
    persisted = true;
    return { paymentAttempt: attempt };
  });
  try {
    const client = new PaymentHttpClient(await listen(app), token, 50);
    const start = Date.now();
    await assert.rejects(client.pay(id, 'success'));
    assert.ok(Date.now() - start < 1000);
    await new Promise(resolve => setTimeout(resolve, 180));
    assert.equal(calls, 1);
    assert.equal(persisted, true);
  } finally { await app.close(); }
});

test('Identité valide réellement le cookie et seul son id entre dans Billetterie', async () => {
  const app = createHttpApp(async () => {});
  app.get('/api/auth/me', async (request, reply) => request.cookies.ticketing_session === 'valid-token'
    ? { user: { id: 'user-alice', login: 'alice', ignored: 'field' } }
    : reply.code(401).send({ error: { code: 'AUTH_REQUIRED', message: 'Connectez-vous.' } }));
  try {
    const actors = createSessionActor(await listen(app), 1000);
    await assert.rejects(actors.resolve(undefined), { code: 'AUTH_REQUIRED' });
    await assert.rejects(actors.resolve('user-alice'), { code: 'AUTH_REQUIRED' });
    assert.deepEqual(await actors.resolve('valid-token'), { id: 'user-alice' });
  } finally { await app.close(); }
});

test('Identité coupée provoque une erreur technique et une réponse utilisateur invalide est refusée', async () => {
  const app = createHttpApp(async () => {});
  app.get('/api/auth/me', async () => ({ user: { login: 'alice' } }));
  const url = await listen(app);
  try { await assert.rejects(createSessionActor(url, 200).resolve('valid-token')); }
  finally { await app.close(); }
  await assert.rejects(createSessionActor(url, 200).resolve('valid-token'));
});

test('la gateway conserve cookie, JSON, statut et logout sans transmettre des en-têtes forgés', async () => {
  const upstream = createHttpApp(async () => {});
  upstream.post('/api/auth/login', async (request, reply) => {
    assert.equal(request.headers['x-actor-id'], undefined);
    assert.equal(request.headers['x-service-token'], undefined);
    assert.deepEqual(request.body, { login: 'alice' });
    return reply.setCookie('ticketing_session', 'token', { httpOnly: true, path: '/' }).send({ user: { id: 'alice', login: 'alice' } });
  });
  upstream.post('/api/auth/logout', async (request, reply) => {
    assert.equal(request.cookies.ticketing_session, 'token');
    return reply.clearCookie('ticketing_session', { path: '/' }).code(204).send();
  });
  const url = await listen(upstream);
  const gateway = buildGatewayApp({ identityUrl: url, ticketingUrl: url, timeoutMs: 1000 });
  try {
    const login = await gateway.inject({ method: 'POST', url: '/api/auth/login', headers: { 'x-actor-id': 'bob', 'x-service-token': 'forged' }, payload: { login: 'alice' } });
    assert.equal(login.statusCode, 200);
    assert.match(String(login.headers['set-cookie']), /HttpOnly/);
    const logout = await gateway.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: 'ticketing_session=token' } });
    assert.equal(logout.statusCode, 204);
    assert.equal(logout.body, '');
    assert.match(String(logout.headers['set-cookie']), /Expires=/);
  } finally { await gateway.close(); await upstream.close(); }
});
