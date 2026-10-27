import type { CheckoutReservationCommand, CheckoutReservationResult } from './commands/CheckoutReservation.js';
import type { ExpirePendingReservationsCommand, ExpirePendingReservationsResult } from './commands/ExpirePendingReservations.js';
import type { LoginUserCommand, LoginUserResult } from './commands/LoginUser.js';
import type { LogoutUserCommand, LogoutUserResult } from './commands/LogoutUser.js';
import type { ReservePlaceCommand, ReservePlaceResult } from './commands/ReservePlace.js';
import type { GetCurrentUserQuery, GetCurrentUserResult } from './queries/GetCurrentUser.js';
import type { GetEventQuery, GetEventResult } from './queries/GetEvent.js';
import type { GetMyReservationQuery, GetMyReservationResult } from './queries/GetMyReservation.js';
import type { ListEventsQuery, ListEventsResult } from './queries/ListEvents.js';
import type { CommandHandler } from './ports/CommandHandler.js';
import type { QueryHandler } from './ports/QueryHandler.js';

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
