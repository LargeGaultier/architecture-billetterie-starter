// Anciens noms du socle, réexportés uniquement depuis les API publiques.
export type { User as UserView, UserAccount, Session } from './modules/identity/index.js';
export type { Event as EventView, EventStatus, Reservation as ReservationView,
  ReservationStatus, PaymentAttempt as PaymentAttemptView, PaymentStatus, PaymentScenario } from './modules/ticketing/index.js';
