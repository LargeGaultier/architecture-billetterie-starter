// Compatibilité des anciens imports du socle ; le cœur importe chaque modèle directement.
export type { User as UserView } from './domain/models/User.js';
export type { UserAccount } from './domain/models/UserAccount.js';
export type { Session } from './domain/models/Session.js';
export type { Event as EventView } from './domain/models/Event.js';
export type { EventStatus } from './domain/models/EventStatus.js';
export type { Reservation as ReservationView } from './domain/models/Reservation.js';
export type { ReservationStatus } from './domain/models/ReservationStatus.js';
export type { PaymentAttempt as PaymentAttemptView } from './domain/models/PaymentAttempt.js';
export type { PaymentStatus } from './domain/models/PaymentStatus.js';
export type { PaymentScenario } from './domain/models/PaymentScenario.js';
