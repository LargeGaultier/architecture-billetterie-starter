import type { Event } from '../../domain/models/Event.js';
import type { PaymentAttempt } from '../../domain/models/PaymentAttempt.js';
import type { PaymentStatus } from '../../domain/models/PaymentStatus.js';
import type { Reservation } from '../../domain/models/Reservation.js';
import type { EventStore } from '../../application/ports/EventStore.js';
import type { IdGenerator } from '../../../../shared/application/ports/IdGenerator.js';
import type { ReservationStore } from '../../application/ports/ReservationStore.js';
import { ExpirePendingReservationsHandler } from '../../application/commands/ExpirePendingReservations.js';
import type { EventReader } from '../../application/ports/EventReader.js';
import type { PaymentAttemptReader } from '../../application/ports/PaymentAttemptReader.js';
import type { PendingReservationExpirer } from '../../application/ports/PendingReservationExpirer.js';

export const reservationId = '11111111-1111-4111-8111-111111111111';
export function ticketingFixture() {
  let now = Date.parse('2027-01-01T12:00:00Z');
  let sequence = 0;
  let paymentResult: PaymentStatus = 'SUCCEEDED';
  const effects: string[] = [];
  const event: Event = { id: 'concert', title: 'Concert', venue: 'Salle', startsAt: '2027-06-01T18:00:00.000Z', capacity: 2, available: 1, status: 'OPEN' };
  const reservation: Reservation = { id: reservationId, eventId: event.id, customerRef: 'alice', status: 'PENDING', createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 60_000).toISOString() };
  const eventRows = new Map([[event.id, event]]);
  const reservationRows = new Map([[reservation.id, reservation]]);
  const attemptRows = new Map<string, PaymentAttempt>();
  const events: EventStore & EventReader = {
    async list() { return [...eventRows.values()].map(row => ({ ...row })); },
    async find(id) { const row = eventRows.get(id); return row ? { ...row } : null; },
  };
  const reservations: ReservationStore & PendingReservationExpirer = {
    async expirePending() {
      effects.push('expire');
      for (const row of reservationRows.values()) {
        if (row.status === 'PENDING' && Date.parse(row.expiresAt) <= now) row.status = 'EXPIRED';
      }
    },
    async find(id) { const row = reservationRows.get(id); return row ? { ...row } : null; },
    async create(id, eventId, customerRef, expiresAt) {
      effects.push('reservation:create');
      const row: Reservation = { id, eventId, customerRef, status: 'PENDING', createdAt: new Date(now).toISOString(), expiresAt: expiresAt.toISOString() };
      reservationRows.set(id, row);
      return { ...row };
    },
    async changeStatus(id, status) {
      effects.push(`reservation:${status}`);
      const row = reservationRows.get(id)!;
      row.status = status;
      return { ...row };
    },
  };
  const attempts = {
    async create(id: string, reservationId: string, scenario: 'success' | 'failure' | 'slow') {
      effects.push('attempt:create');
      const row: PaymentAttempt = { id, reservationId, scenario, status: 'PENDING', createdAt: new Date(now).toISOString() };
      attemptRows.set(id, row);
      return { ...row };
    },
    async changeStatus(id: string, status: PaymentStatus) {
      effects.push(`attempt:${status}`);
      const row = attemptRows.get(id)!;
      row.status = status;
      return { ...row };
    },
    async listForReservation(id: string) { return [...attemptRows.values()].filter(row => row.reservationId === id).map(row => ({ ...row })); },
  };
  const payment = { async run(scenario: 'success' | 'failure' | 'slow') { effects.push(`payment:${scenario}`); return paymentResult; } };
  const ids: IdGenerator = { next: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` };
  const clock = { now: () => now };
  const pause = { async wait(ms: number) { effects.push(`pause:${ms}`); } };
  const expiration = new ExpirePendingReservationsHandler(reservations);
  const processor = { async pay(id: string, scenario: 'success' | 'failure' | 'slow') {
    let attempt = await attempts.create(ids.next(), id, scenario);
    const result = await payment.run(scenario);
    if (result !== 'PENDING') attempt = await attempts.changeStatus(attempt.id, result);
    return attempt;
  } };
  return { events, reservations, attempts, payment, processor, ids, clock, pause, effects, event, reservation, expiration,
    eventRows, reservationRows, attemptRows, setNow: (value: number) => { now = value; },
    setPaymentResult: (value: PaymentStatus) => { paymentResult = value; } };
}
