import type { CheckoutReservationCommand, CheckoutReservationResult } from '../modules/ticketing/application/commands/CheckoutReservation.js';
import type { ExpirePendingReservationsCommand, ExpirePendingReservationsResult } from '../modules/ticketing/application/commands/ExpirePendingReservations.js';
import type { LoginUserCommand, LoginUserResult } from '../modules/identity/application/commands/LoginUser.js';
import type { LogoutUserCommand, LogoutUserResult } from '../modules/identity/application/commands/LogoutUser.js';
import type { ReservePlaceCommand, ReservePlaceResult } from '../modules/ticketing/application/commands/ReservePlace.js';
import type { GetCurrentUserQuery, GetCurrentUserResult } from '../modules/identity/application/queries/GetCurrentUser.js';
import type { GetEventQuery, GetEventResult } from '../modules/ticketing/application/queries/GetEvent.js';
import type { GetMyReservationQuery, GetMyReservationResult } from '../modules/ticketing/application/queries/GetMyReservation.js';
import type { ListEventsQuery, ListEventsResult } from '../modules/ticketing/application/queries/ListEvents.js';
import type { CommandHandler } from '../shared/application/ports/CommandHandler.js';
import type { QueryHandler } from '../shared/application/ports/QueryHandler.js';

export interface Application {
  commands: {
    checkoutReservation: CommandHandler<CheckoutReservationCommand, CheckoutReservationResult>;
    expirePendingReservations: CommandHandler<ExpirePendingReservationsCommand, ExpirePendingReservationsResult>;
    loginUser: CommandHandler<LoginUserCommand, LoginUserResult>;
    logoutUser: CommandHandler<LogoutUserCommand, LogoutUserResult>;
    reservePlace: CommandHandler<ReservePlaceCommand, ReservePlaceResult>;
  };
  queries: {
    getCurrentUser: QueryHandler<GetCurrentUserQuery, GetCurrentUserResult>;
    getEvent: QueryHandler<GetEventQuery, GetEventResult>;
    getMyReservation: QueryHandler<GetMyReservationQuery, GetMyReservationResult>;
    listEvents: QueryHandler<ListEventsQuery, ListEventsResult>;
  };
}
