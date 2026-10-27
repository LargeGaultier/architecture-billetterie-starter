import type { CheckoutReservation } from './CheckoutReservation.js';
import type { GetCurrentUser } from './GetCurrentUser.js';
import type { GetEvent } from './GetEvent.js';
import type { GetReservation } from './GetReservation.js';
import type { ListEvents } from './ListEvents.js';
import type { Login } from './Login.js';
import type { Logout } from './Logout.js';
import type { ReservePlace } from './ReservePlace.js';

export interface UseCases {
  checkout: Pick<CheckoutReservation, 'execute'>;
  me: Pick<GetCurrentUser, 'execute'>;
  getEvent: Pick<GetEvent, 'execute'>;
  getReservation: Pick<GetReservation, 'execute'>;
  listEvents: Pick<ListEvents, 'execute'>;
  login: Pick<Login, 'execute'>;
  logout: Pick<Logout, 'execute'>;
  reserve: Pick<ReservePlace, 'execute'>;
}
