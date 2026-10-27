import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GetMyReservationHandler } from '../../src/application/queries/GetMyReservation.js';
import { CheckoutReservationHandler } from '../../src/application/commands/CheckoutReservation.js';
import { reservationId, ticketingFixture } from './ticketing-fixture.js';

test('consulter sa réservation périmée ne modifie aucun état', async () => {
  const f = ticketingFixture();
  f.setNow(Date.parse(f.reservation.expiresAt));
  const before = structuredClone([...f.reservationRows.values()]);
  const dto = await new GetMyReservationHandler(f.reservations, f.attempts).execute({ reservationId: reservationId, actorId: 'alice' });
  assert.equal(dto.status, 'PENDING');
  assert.deepEqual(f.effects, []);
  assert.deepEqual([...f.reservationRows.values()], before);
});

test('le DTO privé copie la réservation et filtre les détails internes des tentatives', async () => {
  const f = ticketingFixture();
  const reservation = { ...f.reservation, internalRef: 'secret', save: () => assert.fail('écriture interdite') };
  const attempt = { id: 'attempt-1', reservationId, scenario: 'slow' as const, status: 'PENDING' as const,
    createdAt: f.reservation.createdAt, providerSecret: 'secret' };
  const query = new GetMyReservationHandler({ ...f.reservations, async find() { return reservation; } },
    { async listForReservation() { return [attempt]; } });
  const dto = await query.execute({ reservationId: reservationId, actorId: 'alice' });
  assert.deepEqual(Object.keys(dto).sort(), ['createdAt', 'customerRef', 'eventId', 'expiresAt', 'id', 'paymentAttempts', 'status']);
  assert.deepEqual(Object.keys(dto.paymentAttempts[0]).sort(), ['createdAt', 'id', 'reservationId', 'scenario', 'status']);
  assert.notEqual(dto, reservation);
  assert.notEqual(dto.paymentAttempts[0], attempt);
});

test('le checkout revalide une réservation devenue expirée après la lecture', async () => {
  const f = ticketingFixture();
  const query = new GetMyReservationHandler(f.reservations, f.attempts);
  const checkout = new CheckoutReservationHandler(f.reservations, f.attempts, f.payment, f.ids, f.expiration);
  const shown = await query.execute({ reservationId: reservationId, actorId: 'alice' });
  assert.equal(shown.status, 'PENDING');
  f.setNow(Date.parse(shown.expiresAt));
  f.effects.length = 0;
  await assert.rejects(checkout.execute({ reservationId: reservationId, actorId: 'alice', scenario: 'success' }), { code: 'RESERVATION_EXPIRED' });
  assert.equal(shown.status, 'PENDING');
  assert.equal(f.attemptRows.size, 0);
  assert.deepEqual(f.effects, ['expire']);
});
