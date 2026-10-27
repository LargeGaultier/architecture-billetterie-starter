import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Application } from '../src/contracts/Application.js';
import { buildHttpApp } from '../src/adapters/http/buildHttpApp.js';
import { BusinessError } from '../src/shared/domain/BusinessError.js';

function application(): Application {
  const unexpected = { async execute(): Promise<never> { assert.fail('Parcours inattendu.'); } };
  return {
    identity: { commands: { loginUser: unexpected, logoutUser: unexpected }, queries: { getCurrentUser: unexpected } },
    ticketing: { commands: { checkoutReservation: unexpected, expirePendingReservations: unexpected, reservePlace: unexpected },
      queries: { getEvent: unexpected, getMyReservation: unexpected, listEvents: unexpected } },
  };
}

const event = { id: 'concert', title: 'Concert', venue: 'Salle', startsAt: '2027-01-01T12:00:00.000Z',
  capacity: 10, available: 10, status: 'OPEN' as const };
const reservation = { id: '11111111-1111-4111-8111-111111111111', eventId: 'concert', customerRef: 'alice',
  status: 'PENDING' as 'PENDING' | 'EXPIRED', createdAt: '2027-01-01T12:00:00.000Z', expiresAt: '2027-01-01T12:15:00.000Z', paymentAttempts: [] };

for (const route of ['/api/events', '/api/events/concert']) {
  test(`HTTP ${route} déclenche la maintenance avant la requête publique`, async () => {
    const handlers = application();
    const calls: string[] = [];
    handlers.ticketing.commands.expirePendingReservations = { async execute() { calls.push('expire'); } };
    handlers.ticketing.queries.listEvents = { async execute() { calls.push('list'); return [event]; } };
    handlers.ticketing.queries.getEvent = { async execute(query) { assert.equal(query.eventId, 'concert'); calls.push('detail'); return event; } };
    const app = buildHttpApp(handlers, { secureCookies: false, sessionTtlMs: 1_800_000 }, async () => {});
    try {
      const response = await app.inject(route);
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), route === '/api/events' ? { events: [event] } : { event });
      assert.deepEqual(calls, ['expire', route === '/api/events' ? 'list' : 'detail']);
    } finally { await app.close(); }
  });
}

test('le détail privé autorise puis expire puis relit le DTO', async () => {
  const handlers = application();
  const calls: string[] = [];
  let status: 'PENDING' | 'EXPIRED' = 'PENDING';
  handlers.identity.queries.getCurrentUser = { async execute() { calls.push('me'); return { id: 'alice', login: 'alice' }; } };
  handlers.ticketing.queries.getMyReservation = { async execute(query) {
    assert.deepEqual(query, { reservationId: reservation.id, actorId: 'alice' });
    calls.push(`read:${status}`); return { ...reservation, status };
  } };
  handlers.ticketing.commands.expirePendingReservations = { async execute() { calls.push('expire'); status = 'EXPIRED'; } };
  const app = buildHttpApp(handlers, { secureCookies: false, sessionTtlMs: 1_800_000 }, async () => {});
  try {
    const response = await app.inject(`/api/reservations/${reservation.id}`);
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().reservation.status, 'EXPIRED');
    assert.deepEqual(calls, ['me', 'read:PENDING', 'expire', 'read:EXPIRED']);
  } finally { await app.close(); }
});

for (const code of ['AUTH_REQUIRED', 'RESERVATION_FORBIDDEN'] as const) {
  test(`le détail privé ${code} ne déclenche aucune maintenance`, async () => {
    const handlers = application();
    const calls: string[] = [];
    handlers.identity.queries.getCurrentUser = { async execute() {
      calls.push('me');
      if (code === 'AUTH_REQUIRED') throw new BusinessError(code, 'Refus.');
      return { id: 'bob', login: 'bob' };
    } };
    handlers.ticketing.queries.getMyReservation = { async execute() { calls.push('access'); throw new BusinessError('RESERVATION_FORBIDDEN', 'Refus.'); } };
    const app = buildHttpApp(handlers, { secureCookies: false, sessionTtlMs: 1_800_000 }, async () => {});
    try {
      const response = await app.inject(`/api/reservations/${reservation.id}`);
      assert.equal(response.statusCode, code === 'AUTH_REQUIRED' ? 401 : 403);
      assert.equal(response.json().error.code, code);
      assert.deepEqual(calls, code === 'AUTH_REQUIRED' ? ['me'] : ['me', 'access']);
    } finally { await app.close(); }
  });
}
