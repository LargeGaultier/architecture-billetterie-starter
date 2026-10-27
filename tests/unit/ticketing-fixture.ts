import type { Event } from '../../src/domain/models/Event.js';
import type { PaymentAttempt } from '../../src/domain/models/PaymentAttempt.js';
import type { PaymentStatus } from '../../src/domain/models/PaymentStatus.js';
import type { Reservation } from '../../src/domain/models/Reservation.js';
import type { EventStore } from '../../src/application/ports/EventStore.js';
import type { IdGenerator } from '../../src/application/ports/IdGenerator.js';
import type { PaymentAttemptStore } from '../../src/application/ports/PaymentAttemptStore.js';
import type { PaymentGateway } from '../../src/application/ports/PaymentGateway.js';
import type { ReservationStore } from '../../src/application/ports/ReservationStore.js';
import { ExpirePendingReservationsHandler } from '../../src/application/commands/ExpirePendingReservations.js';

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
  const events: EventStore = {
    async list() { return [...eventRows.values()].map(row => ({ ...row })); },
    async find(id) { const row = eventRows.get(id); return row ? { ...row } : null; },
  };
  const reservations: ReservationStore = {
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
  const attempts: PaymentAttemptStore = {
    async create(id, reservationId, scenario) {
      effects.push('attempt:create');
      const row: PaymentAttempt = { id, reservationId, scenario, status: 'PENDING', createdAt: new Date(now).toISOString() };
      attemptRows.set(id, row);
      return { ...row };
    },
    async changeStatus(id, status) {
      effects.push(`attempt:${status}`);
      const row = attemptRows.get(id)!;
      row.status = status;
      return { ...row };
    },
    async listForReservation(id) { return [...attemptRows.values()].filter(row => row.reservationId === id).map(row => ({ ...row })); },
  };
  const payment: PaymentGateway = { async run(scenario) { effects.push(`payment:${scenario}`); return paymentResult; } };
  const ids: IdGenerator = { next: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` };
  const clock = { now: () => now };
  const pause = { async wait(ms: number) { effects.push(`pause:${ms}`); } };
  const expiration = new ExpirePendingReservationsHandler(reservations);
  return { events, reservations, attempts, payment, ids, clock, pause, effects, event, reservation, expiration,
    eventRows, reservationRows, attemptRows, setNow: (value: number) => { now = value; },
    setPaymentResult: (value: PaymentStatus) => { paymentResult = value; } };
}
