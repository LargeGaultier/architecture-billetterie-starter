import type { CommandHandler } from '../../../shared/application/ports/CommandHandler.js';
import type { QueryHandler } from '../../../shared/application/ports/QueryHandler.js';
import type { CheckoutReservationCommand, CheckoutReservationResult } from '../application/commands/CheckoutReservation.js';
import type { ExpirePendingReservationsCommand, ExpirePendingReservationsResult } from '../application/commands/ExpirePendingReservations.js';
import type { ReservePlaceCommand, ReservePlaceResult } from '../application/commands/ReservePlace.js';
import type { GetEventQuery, GetEventResult } from '../application/queries/GetEvent.js';
import type { GetMyReservationQuery, GetMyReservationResult } from '../application/queries/GetMyReservation.js';
import type { ListEventsQuery, ListEventsResult } from '../application/queries/ListEvents.js';

export interface TicketingApi {
  commands: {
    checkoutReservation: CommandHandler<CheckoutReservationCommand, CheckoutReservationResult>;
    expirePendingReservations: CommandHandler<ExpirePendingReservationsCommand, ExpirePendingReservationsResult>;
    reservePlace: CommandHandler<ReservePlaceCommand, ReservePlaceResult>;
  };
  queries: {
    getEvent: QueryHandler<GetEventQuery, GetEventResult>;
    getMyReservation: QueryHandler<GetMyReservationQuery, GetMyReservationResult>;
    listEvents: QueryHandler<ListEventsQuery, ListEventsResult>;
  };
}
