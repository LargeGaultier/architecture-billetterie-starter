import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CheckoutReservationHandler } from '../../application/commands/CheckoutReservation.js';
import { reservationId, ticketingFixture } from './ticketing-fixture.js';

function fixture() {
  const f = ticketingFixture();
  return { ...f, checkout: new CheckoutReservationHandler(f.reservations, f.processor, f.expiration) };
}

test('checkout sans identité : AUTH_REQUIRED avant toute lecture ou effet', async () => {
  const f = fixture();
  await assert.rejects(f.checkout.execute({ reservationId: reservationId, actorId: undefined, scenario: 'success' }), { code: 'AUTH_REQUIRED' });
  assert.deepEqual(f.effects, []);
  assert.equal(f.reservation.status, 'PENDING');
});

test('checkout étranger même expiré : refus avant expiration, tentative ou paiement', async () => {
  const f = fixture();
  f.reservation.expiresAt = '2026-01-01T00:00:00.000Z';
  await assert.rejects(f.checkout.execute({ reservationId: reservationId, actorId: 'bob', scenario: 'success' }), { code: 'RESERVATION_FORBIDDEN' });
  assert.deepEqual(f.effects, []);
  assert.equal(f.reservation.status, 'PENDING');
  assert.equal(f.attemptRows.size, 0);
});

for (const [id, code] of [['invalide', 'INVALID_INPUT'], ['22222222-2222-4222-8222-222222222222', 'RESERVATION_NOT_FOUND']]) {
  test(`checkout ${code} sans effet`, async () => {
    const f = fixture();
    await assert.rejects(f.checkout.execute({ reservationId: id, actorId: 'alice', scenario: 'success' }), { code });
    assert.deepEqual(f.effects, []);
  });
}

test('scénario invalide refusé avant toute tentative et expiration', async () => {
  const f = fixture();
  await assert.rejects(f.checkout.execute({ reservationId: reservationId, actorId: 'alice', scenario: 'invalide' }), { code: 'INVALID_INPUT' });
  assert.deepEqual(f.effects, []);
});

for (const status of ['CONFIRMED', 'FAILED', 'EXPIRED'] as const) {
  test(`checkout ${status} ne crée aucune tentative et ne déclenche pas de paiement`, async () => {
    const f = fixture();
    f.reservation.status = status;
    await assert.rejects(f.checkout.execute({ reservationId: reservationId, actorId: 'alice', scenario: 'success' }), {
      code: status === 'EXPIRED' ? 'RESERVATION_EXPIRED' : 'RESERVATION_CLOSED',
    });
    assert.deepEqual(f.effects, ['expire']);
    assert.equal(f.reservation.status, status);
  });
}

test('checkout expire une réservation au seuil exact avant le paiement', async () => {
  const f = fixture();
  f.setNow(Date.parse(f.reservation.expiresAt));
  await assert.rejects(f.checkout.execute({ reservationId: reservationId, actorId: 'alice', scenario: 'success' }), { code: 'RESERVATION_EXPIRED' });
  assert.equal(f.reservation.status, 'EXPIRED');
  assert.deepEqual(f.effects, ['expire']);
});

for (const [scenario, paymentStatus, reservationStatus] of [
  ['success', 'SUCCEEDED', 'CONFIRMED'], ['failure', 'FAILED', 'FAILED'], ['slow', 'PENDING', 'PENDING'],
] as const) {
  test(`checkout ${scenario} conserve les transitions et l'ordre des effets`, async () => {
    const f = fixture();
    f.setPaymentResult(paymentStatus);
    const result = await f.checkout.execute({ reservationId: reservationId, actorId: 'alice', scenario: scenario });
    assert.equal(result.reservation.status, reservationStatus);
    assert.equal(result.paymentAttempt.status, paymentStatus);
    assert.equal(result.paymentAttempt.reservationId, reservationId);
    assert.equal(f.reservationRows.get(reservationId)!.status, reservationStatus);
    assert.equal(f.attemptRows.get(result.paymentAttempt.id)!.status, paymentStatus);
    assert.deepEqual(f.effects, paymentStatus === 'PENDING'
      ? ['expire', 'attempt:create', `payment:${scenario}`]
      : ['expire', 'attempt:create', `payment:${scenario}`, `attempt:${paymentStatus}`, `reservation:${reservationStatus}`]);
  });
}
