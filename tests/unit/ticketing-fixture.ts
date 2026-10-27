import type { EventView, PaymentAttemptView, PaymentStatus, ReservationView } from '../../src/domain/models.js';
import type { EventStore, IdGenerator, PaymentAttemptStore, PaymentGateway, ReservationStore } from '../../src/application/ports.js';

export const reservationId = '11111111-1111-4111-8111-111111111111';
export function ticketingFixture() {
  let now = Date.parse('2027-01-01T12:00:00Z');
  let sequence = 0;
  let paymentResult: PaymentStatus = 'SUCCEEDED';
  const effects: string[] = [];
  const event: EventView = { id: 'concert', title: 'Concert', venue: 'Salle', startsAt: '2027-06-01T18:00:00.000Z', capacity: 2, available: 1, status: 'OPEN' };
  const reservation: ReservationView = { id: reservationId, eventId: event.id, customerRef: 'alice', status: 'PENDING', createdAt: new Date(now).toISOString(), expiresAt: new Date(now + 60_000).toISOString() };
  const eventRows = new Map([[event.id, event]]);
  const reservationRows = new Map([[reservation.id, reservation]]);
  const attemptRows = new Map<string, PaymentAttemptView>();
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
      const row: ReservationView = { id, eventId, customerRef, status: 'PENDING', createdAt: new Date(now).toISOString(), expiresAt: expiresAt.toISOString() };
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
      const row: PaymentAttemptView = { id, reservationId, scenario, status: 'PENDING', createdAt: new Date(now).toISOString() };
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
  return { events, reservations, attempts, payment, ids, clock, pause, effects, event, reservation,
    eventRows, reservationRows, attemptRows, setNow: (value: number) => { now = value; },
    setPaymentResult: (value: PaymentStatus) => { paymentResult = value; } };
}
