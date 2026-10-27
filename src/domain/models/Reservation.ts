import type { ReservationStatus } from './ReservationStatus.js';

export interface Reservation {
  id: string;
  eventId: string;
  customerRef: string;
  status: ReservationStatus;
  createdAt: string;
  expiresAt: string;
}
