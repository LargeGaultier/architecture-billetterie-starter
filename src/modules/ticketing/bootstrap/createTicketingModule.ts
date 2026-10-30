import type { Pool } from 'pg';
import type { TicketingApi } from '../contracts/TicketingApi.js';
import type { TicketingConfig } from '../contracts/TicketingConfig.js';
import { CheckoutReservationHandler } from '../application/commands/CheckoutReservation.js';
import { ExpirePendingReservationsHandler } from '../application/commands/ExpirePendingReservations.js';
import { ReservePlaceHandler } from '../application/commands/ReservePlace.js';
import { GetEventHandler } from '../application/queries/GetEvent.js';
import { GetMyReservationHandler } from '../application/queries/GetMyReservation.js';
import { ListEventsHandler } from '../application/queries/ListEvents.js';
import { EventRepository } from '../adapters/postgres/EventRepository.js';
import type { PaymentProcessor } from '../application/ports/PaymentProcessor.js';
import type { PaymentAttemptReader } from '../application/ports/PaymentAttemptReader.js';
import { ReservationRepository } from '../adapters/postgres/ReservationRepository.js';
import { uuidIds, timerPause } from '../adapters/system/runtime.js';
import { systemClock } from '../../../shared/adapters/system/clock.js';

export function createTicketingModule(pool: Pool, config: TicketingConfig, payment: PaymentProcessor & PaymentAttemptReader): TicketingApi {
  const events = new EventRepository(pool);
  const reservations = new ReservationRepository(pool);
  const expiration = new ExpirePendingReservationsHandler(reservations);
  return {
    commands: {
      checkoutReservation: new CheckoutReservationHandler(reservations, payment, expiration),
      expirePendingReservations: expiration,
      reservePlace: new ReservePlaceHandler(events, reservations, expiration, uuidIds, systemClock, timerPause, config),
    },
    queries: {
      getEvent: new GetEventHandler(events),
      getMyReservation: new GetMyReservationHandler(reservations, payment),
      listEvents: new ListEventsHandler(events),
    },
  };
}
