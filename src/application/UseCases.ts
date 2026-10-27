import type { CheckoutReservationCommand, CheckoutReservationResult } from './commands/CheckoutReservation.js';
import type { GetCurrentUser } from './GetCurrentUser.js';
import type { GetEventQuery, GetEventResult } from './queries/GetEvent.js';
import type { GetMyReservationQuery, GetMyReservationResult } from './queries/GetMyReservation.js';
import type { ListEvents } from './ListEvents.js';
import type { Login } from './Login.js';
import type { Logout } from './Logout.js';
import type { ReservePlaceCommand, ReservePlaceResult } from './commands/ReservePlace.js';
import type { ExpirePendingReservationsCommand } from './commands/ExpirePendingReservations.js';
import type { CommandHandler } from './ports/CommandHandler.js';
import type { QueryHandler } from './ports/QueryHandler.js';

export interface UseCases {
  checkout: CommandHandler<CheckoutReservationCommand, CheckoutReservationResult>;
  me: Pick<GetCurrentUser, 'execute'>;
  getEvent: QueryHandler<GetEventQuery, GetEventResult>;
  getReservation: QueryHandler<GetMyReservationQuery, GetMyReservationResult>;
  listEvents: Pick<ListEvents, 'execute'>;
  login: Pick<Login, 'execute'>;
  logout: Pick<Logout, 'execute'>;
  reserve: CommandHandler<ReservePlaceCommand, ReservePlaceResult>;
  expirePendingReservations: CommandHandler<ExpirePendingReservationsCommand, void>;
}
