import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ReservePlaceHandler } from '../../src/application/commands/ReservePlace.js';
import { GetReservation } from '../../src/application/GetReservation.js';
import { reservationId, ticketingFixture } from './ticketing-fixture.js';

function fixture() {
  const f = ticketingFixture();
  return { ...f,
    reserve: new ReservePlaceHandler(f.events, f.reservations, f.expiration, f.ids, f.clock, f.pause, { reservationTtlMinutes: 15, reservationHoldMs: 0 }),
    get: new GetReservation(f.reservations, f.attempts),
  };
}

test('réserver enregistre seulement l’auteur vérifié et une expiration de 15 minutes', async () => {
  const f = fixture();
  const result = await f.reserve.execute({ eventId: 'concert', actorId: 'alice' });
  assert.equal(result.customerRef, 'alice');
  assert.equal(result.status, 'PENDING');
  assert.equal(result.eventId, 'concert');
  assert.equal(result.expiresAt, '2027-01-01T12:15:00.000Z');
  assert.equal(f.reservationRows.get(result.id)!.customerRef, 'alice');
  assert.deepEqual(f.effects, ['expire', 'reservation:create']);
});

for (const [eventId, userId, code] of [['concert', undefined, 'AUTH_REQUIRED'], ['', 'alice', 'INVALID_INPUT'], ['concert', 'x'.repeat(81), 'INVALID_INPUT']] as const) {
  test(`réserver ${code} : aucun effet avant validation`, async () => {
    const f = fixture();
    await assert.rejects(f.reserve.execute({ eventId, actorId: userId }), { code });
    assert.deepEqual(f.effects, []);
  });
}

for (const code of ['EVENT_NOT_FOUND', 'EVENT_CANCELLED', 'SOLD_OUT'] as const) {
  test(`réserver ${code} ne crée pas de réservation`, async () => {
    const f = fixture();
    if (code === 'EVENT_NOT_FOUND') f.eventRows.clear();
    if (code === 'EVENT_CANCELLED') { f.event.status = 'CANCELLED'; f.event.available = 0; }
    if (code === 'SOLD_OUT') f.event.available = 0;
    await assert.rejects(f.reserve.execute({ eventId: 'concert', actorId: 'alice' }), { code });
    assert.equal(f.reservationRows.size, 1);
    assert.deepEqual(f.effects, ['expire']);
  });
}

test('réserver garde la pause pédagogique derrière un port sans attente réelle', async () => {
  const f = fixture();
  const reserve = new ReservePlaceHandler(f.events, f.reservations, f.expiration, f.ids, f.clock, f.pause, { reservationTtlMinutes: 5, reservationHoldMs: 75 });
  const result = await reserve.execute({ eventId: 'concert', actorId: 'alice' });
  assert.equal(result.expiresAt, '2027-01-01T12:05:00.000Z');
  assert.deepEqual(f.effects, ['expire', 'pause:75', 'reservation:create']);
});

test('consulter sa réservation expire au seuil exact et retrouve ses seules tentatives', async () => {
  const f = fixture();
  const ownAttempt = await f.attempts.create('attempt-1', reservationId, 'slow');
  await f.attempts.create('attempt-2', 'autre-reservation', 'success');
  f.effects.length = 0;
  f.setNow(Date.parse(f.reservation.expiresAt));
  const result = await f.get.execute(reservationId, 'alice');
  assert.equal(result.status, 'EXPIRED');
  assert.deepEqual(result.paymentAttempts, [ownAttempt]);
  assert.deepEqual(f.effects, ['expire']);
});

for (const [id, userId, code] of [
  [reservationId, undefined, 'AUTH_REQUIRED'], [reservationId, 'bob', 'RESERVATION_FORBIDDEN'],
  ['invalide', 'alice', 'INVALID_INPUT'], ['22222222-2222-4222-8222-222222222222', 'alice', 'RESERVATION_NOT_FOUND'],
] as const) {
  test(`consultation ${code} sans mutation ni lecture des tentatives`, async () => {
    const f = fixture();
    f.reservation.expiresAt = '2026-01-01T00:00:00.000Z';
    const get = new GetReservation(f.reservations, {
      async listForReservation() { assert.fail('Les tentatives privées ne doivent pas être lues.'); },
    });
    await assert.rejects(get.execute(id, userId), { code });
    assert.equal(f.reservation.status, 'PENDING');
    assert.deepEqual(f.effects, []);
  });
}
