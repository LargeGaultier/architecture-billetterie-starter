import type { Pool } from 'pg';
import { CheckoutReservationHandler } from '../application/commands/CheckoutReservation.js';
import { GetCurrentUser } from '../application/GetCurrentUser.js';
import { GetEventHandler } from '../application/queries/GetEvent.js';
import { GetMyReservationHandler } from '../application/queries/GetMyReservation.js';
import { ListEvents } from '../application/ListEvents.js';
import { Login } from '../application/Login.js';
import { Logout } from '../application/Logout.js';
import { ReservePlaceHandler } from '../application/commands/ReservePlace.js';
import { ExpirePendingReservationsHandler } from '../application/commands/ExpirePendingReservations.js';
import type { UseCases } from '../application/UseCases.js';
import { MemorySessionStore } from '../adapters/auth/MemorySessionStore.js';
import { ScryptPasswordVerifier } from '../adapters/auth/ScryptPasswordVerifier.js';
import { PaymentSimulator } from '../adapters/payment/PaymentSimulator.js';
import { EventRepository } from '../adapters/postgres/EventRepository.js';
import { PaymentAttemptRepository } from '../adapters/postgres/PaymentAttemptRepository.js';
import { ReservationRepository } from '../adapters/postgres/ReservationRepository.js';
import { UserRepository } from '../adapters/postgres/UserRepository.js';
import { sessionIds, systemClock, timerPause, uuidIds } from '../adapters/system/runtime.js';
import type { AuthConfig, TicketingConfig } from './config.js';

export function createUseCases(pool: Pool, config: TicketingConfig, authConfig: AuthConfig = {}): UseCases {
  const events = new EventRepository(pool);
  const reservations = new ReservationRepository(pool);
  const attempts = new PaymentAttemptRepository(pool);
  const users = new UserRepository(pool);
  const sessions = new MemorySessionStore();
  const sessionClock = { now: authConfig.now ?? systemClock.now };
  const expirePendingReservations = new ExpirePendingReservationsHandler(reservations);
  return {
    checkout: new CheckoutReservationHandler(reservations, attempts, new PaymentSimulator(config.paymentSlowMs), uuidIds, expirePendingReservations),
    me: new GetCurrentUser(sessions, users, sessionClock),
    getEvent: new GetEventHandler(events),
    getReservation: new GetMyReservationHandler(reservations, attempts),
    listEvents: new ListEvents(events, reservations),
    login: new Login(users, new ScryptPasswordVerifier(), sessions, sessionIds, sessionClock, authConfig.sessionTtlMs ?? 30 * 60_000),
    logout: new Logout(sessions),
    reserve: new ReservePlaceHandler(events, reservations, expirePendingReservations, uuidIds, systemClock, timerPause, config),
    expirePendingReservations,
  };
}
