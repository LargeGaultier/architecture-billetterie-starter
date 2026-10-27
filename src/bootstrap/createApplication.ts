import type { Pool } from 'pg';
import type { Application } from '../contracts/Application.js';
import { CheckoutReservationHandler } from '../modules/ticketing/application/commands/CheckoutReservation.js';
import { ExpirePendingReservationsHandler } from '../modules/ticketing/application/commands/ExpirePendingReservations.js';
import { LoginUserHandler } from '../modules/identity/application/commands/LoginUser.js';
import { LogoutUserHandler } from '../modules/identity/application/commands/LogoutUser.js';
import { ReservePlaceHandler } from '../modules/ticketing/application/commands/ReservePlace.js';
import { GetCurrentUserHandler } from '../modules/identity/application/queries/GetCurrentUser.js';
import { GetEventHandler } from '../modules/ticketing/application/queries/GetEvent.js';
import { GetMyReservationHandler } from '../modules/ticketing/application/queries/GetMyReservation.js';
import { ListEventsHandler } from '../modules/ticketing/application/queries/ListEvents.js';
import { MemorySessionStore } from '../modules/identity/adapters/auth/MemorySessionStore.js';
import { ScryptPasswordVerifier } from '../modules/identity/adapters/auth/ScryptPasswordVerifier.js';
import { PaymentSimulator } from '../modules/ticketing/adapters/payment/PaymentSimulator.js';
import { EventRepository } from '../modules/ticketing/adapters/postgres/EventRepository.js';
import { PaymentAttemptRepository } from '../modules/ticketing/adapters/postgres/PaymentAttemptRepository.js';
import { ReservationRepository } from '../modules/ticketing/adapters/postgres/ReservationRepository.js';
import { UserRepository } from '../modules/identity/adapters/postgres/UserRepository.js';
import { sessionIds, systemClock, timerPause, uuidIds } from '../adapters/system/runtime.js';
import type { AuthConfig, TicketingConfig } from './config.js';

export function createApplication(pool: Pool, config: TicketingConfig, authConfig: AuthConfig = {}): Application {
  const events = new EventRepository(pool);
  const reservations = new ReservationRepository(pool);
  const attempts = new PaymentAttemptRepository(pool);
  const users = new UserRepository(pool);
  const sessions = new MemorySessionStore();
  const sessionClock = { now: authConfig.now ?? systemClock.now };
  const expiration = new ExpirePendingReservationsHandler(reservations);
  return {
    commands: {
      checkoutReservation: new CheckoutReservationHandler(reservations, attempts, new PaymentSimulator(config.paymentSlowMs), uuidIds, expiration),
      expirePendingReservations: expiration,
      loginUser: new LoginUserHandler(users, new ScryptPasswordVerifier(), sessions, sessionIds, sessionClock, authConfig.sessionTtlMs ?? 30 * 60_000),
      logoutUser: new LogoutUserHandler(sessions),
      reservePlace: new ReservePlaceHandler(events, reservations, expiration, uuidIds, systemClock, timerPause, config),
    },
    queries: {
      getCurrentUser: new GetCurrentUserHandler(sessions, users, sessionClock),
      getEvent: new GetEventHandler(events),
      getMyReservation: new GetMyReservationHandler(reservations, attempts),
      listEvents: new ListEventsHandler(events),
    },
  };
}
