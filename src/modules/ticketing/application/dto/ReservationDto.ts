import type { ReservationStatus } from '../../domain/models/ReservationStatus.js';

export interface ReservationDto {
  readonly id: string;
  readonly eventId: string;
  readonly customerRef: string;
  readonly status: ReservationStatus;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export function toReservationDto(reservation: ReservationDto): ReservationDto {
  return { id: reservation.id, eventId: reservation.eventId, customerRef: reservation.customerRef,
    status: reservation.status, createdAt: reservation.createdAt, expiresAt: reservation.expiresAt };
}
