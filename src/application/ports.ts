import type { EventView, PaymentAttemptView, PaymentScenario, PaymentStatus, ReservationStatus, ReservationView, Session, UserAccount, UserView } from '../domain/models.js';

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

export interface UserStore {
  findByLogin(login: string): Promise<UserAccount | null>;
  findById(id: string): Promise<UserView | null>;
}

export interface PasswordVerifier { verify(password: string, hash: string | null): Promise<boolean> }

export interface SessionStore {
  save(session: Session): Promise<void>;
  find(id: string): Promise<Session | null>;
  revoke(id: string | undefined): Promise<void>;
  removeExpired(now: number): Promise<void>;
}
