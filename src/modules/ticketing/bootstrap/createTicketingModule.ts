import type { Pool } from 'pg';
import type { TicketingApi } from '../contracts/TicketingApi.js';
import type { TicketingConfig } from '../contracts/TicketingConfig.js';
import { CheckoutReservationHandler } from '../application/commands/CheckoutReservation.js';
import { ExpirePendingReservationsHandler } from '../application/commands/ExpirePendingReservations.js';
import { ReservePlaceHandler } from '../application/commands/ReservePlace.js';
import { GetEventHandler } from '../application/queries/GetEvent.js';
import { GetMyReservationHandler } from '../application/queries/GetMyReservation.js';
import { ListEventsHandler } from '../application/queries/ListEvents.js';
import { PaymentSimulator } from '../adapters/payment/PaymentSimulator.js';
import { EventRepository } from '../adapters/postgres/EventRepository.js';
import { PaymentAttemptRepository } from '../adapters/postgres/PaymentAttemptRepository.js';
import { ReservationRepository } from '../adapters/postgres/ReservationRepository.js';
import { uuidIds, timerPause } from '../adapters/system/runtime.js';
import { systemClock } from '../../../shared/adapters/system/clock.js';

export function createTicketingModule(pool: Pool, config: TicketingConfig): TicketingApi {
  const events = new EventRepository(pool);
  const reservations = new ReservationRepository(pool);
  const attempts = new PaymentAttemptRepository(pool);
  const expiration = new ExpirePendingReservationsHandler(reservations);
  return {
    commands: {
      checkoutReservation: new CheckoutReservationHandler(reservations, attempts, new PaymentSimulator(config.paymentSlowMs), uuidIds, expiration),
      expirePendingReservations: expiration,
      reservePlace: new ReservePlaceHandler(events, reservations, expiration, uuidIds, systemClock, timerPause, config),
    },
    queries: {
      getEvent: new GetEventHandler(events),
      getMyReservation: new GetMyReservationHandler(reservations, attempts),
      listEvents: new ListEventsHandler(events),
    },
  };
}
