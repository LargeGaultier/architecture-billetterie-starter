import type { EventView, PaymentAttemptView, PaymentScenario, PaymentStatus, ReservationStatus, ReservationView } from '../domain/models.js';

export interface EventStore {
  list(): Promise<EventView[]>;
  find(id: string): Promise<EventView | null>;
}

export interface ReservationStore {
  expirePending(): Promise<void>;
  create(id: string, eventId: string, customerRef: string, expiresAt: Date): Promise<ReservationView>;
  find(id: string): Promise<ReservationView | null>;
  changeStatus(id: string, status: ReservationStatus): Promise<ReservationView>;
}

export interface PaymentAttemptStore {
  create(id: string, reservationId: string, scenario: PaymentScenario): Promise<PaymentAttemptView>;
  changeStatus(id: string, status: PaymentStatus): Promise<PaymentAttemptView>;
  listForReservation(id: string): Promise<PaymentAttemptView[]>;
}

export interface PaymentGateway { run(scenario: PaymentScenario): Promise<PaymentStatus> }
export interface IdGenerator { next(): string }
export interface Clock { now(): number }
export interface Pause { wait(ms: number): Promise<void> }
