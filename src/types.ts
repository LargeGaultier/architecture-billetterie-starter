// Compatibilité des anciens imports du socle ; le cœur importe chaque modèle directement.
export type { User as UserView } from './modules/identity/domain/models/User.js';
export type { UserAccount } from './modules/identity/domain/models/UserAccount.js';
export type { Session } from './modules/identity/domain/models/Session.js';
export type { Event as EventView } from './modules/ticketing/domain/models/Event.js';
export type { EventStatus } from './modules/ticketing/domain/models/EventStatus.js';
export type { Reservation as ReservationView } from './modules/ticketing/domain/models/Reservation.js';
export type { ReservationStatus } from './modules/ticketing/domain/models/ReservationStatus.js';
export type { PaymentAttempt as PaymentAttemptView } from './modules/ticketing/domain/models/PaymentAttempt.js';
export type { PaymentStatus } from './modules/ticketing/domain/models/PaymentStatus.js';
export type { PaymentScenario } from './modules/ticketing/domain/models/PaymentScenario.js';
