import type { PaymentAttempt } from '../domain/models/PaymentAttempt.js';
import type { Reservation } from '../domain/models/Reservation.js';
import { requireIdentity, requireOwner, validateReservationId } from '../domain/reservationRules.js';
import type { PaymentAttemptStore } from './ports/PaymentAttemptStore.js';
import type { ReservationStore } from './ports/ReservationStore.js';

export class GetReservation {
  constructor(
    private readonly reservations: Pick<ReservationStore, 'find' | 'expirePending'>,
    private readonly attempts: Pick<PaymentAttemptStore, 'listForReservation'>,
  ) {}

  async execute(id: string, userId: string | undefined): Promise<Reservation & { paymentAttempts: PaymentAttempt[] }> {
    const owner = requireIdentity(userId);
    validateReservationId(id);
    requireOwner(await this.reservations.find(id), owner);
    await this.reservations.expirePending();
    const reservation = (await this.reservations.find(id))!;
    return { ...reservation, paymentAttempts: await this.attempts.listForReservation(id) };
  }
}
