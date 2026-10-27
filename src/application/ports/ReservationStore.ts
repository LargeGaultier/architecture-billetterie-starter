import type { Reservation } from '../../domain/models/Reservation.js';
import type { ReservationStatus } from '../../domain/models/ReservationStatus.js';

export interface ReservationStore {
  create(id: string, eventId: string, customerRef: string, expiresAt: Date): Promise<Reservation>;
  find(id: string): Promise<Reservation | null>;
  changeStatus(id: string, status: ReservationStatus): Promise<Reservation>;
}
