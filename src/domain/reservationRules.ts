import { BusinessError } from './BusinessError.js';
import type { EventView, PaymentScenario, PaymentStatus, ReservationView } from './models.js';

export function requireIdentity(userId: string | undefined): string {
  if (!userId?.trim()) throw new BusinessError('AUTH_REQUIRED', 'Connectez-vous pour continuer.');
  return userId;
}

export function validateReservationId(id: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new BusinessError('INVALID_INPUT', 'Identifiant de réservation invalide.');
  }
}

export function requireOwner(reservation: ReservationView | null, userId: string): ReservationView {
  if (!reservation) throw new BusinessError('RESERVATION_NOT_FOUND', 'Réservation introuvable.');
  if (reservation.customerRef !== userId) {
    throw new BusinessError('RESERVATION_FORBIDDEN', 'Cette réservation appartient à un autre utilisateur.');
  }
  return reservation;
}

export function requireReservable(event: EventView | null): EventView {
  if (!event) throw new BusinessError('EVENT_NOT_FOUND', 'Événement introuvable.');
  if (event.status === 'CANCELLED') throw new BusinessError('EVENT_CANCELLED', 'Cet événement est annulé.');
  if (event.available <= 0) throw new BusinessError('SOLD_OUT', 'Il ne reste plus de place.');
  return event;
}

export function requirePayable(reservation: ReservationView): void {
  if (reservation.status === 'EXPIRED') throw new BusinessError('RESERVATION_EXPIRED', 'La réservation a expiré.');
  if (reservation.status !== 'PENDING') throw new BusinessError('RESERVATION_CLOSED', 'La réservation ne peut plus être payée.');
}

export function paymentScenario(value: string): PaymentScenario {
  if (value !== 'success' && value !== 'failure' && value !== 'slow') {
    throw new BusinessError('INVALID_INPUT', 'Scénario de paiement invalide.');
  }
  return value;
}

export function reservationStatusAfterPayment(result: PaymentStatus): 'CONFIRMED' | 'FAILED' | null {
  if (result === 'SUCCEEDED') return 'CONFIRMED';
  if (result === 'FAILED') return 'FAILED';
  return null;
}
