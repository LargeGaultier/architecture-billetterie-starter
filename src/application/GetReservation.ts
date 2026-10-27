import type { PaymentAttemptView, ReservationView } from '../domain/models.js';
import { requireIdentity, requireOwner, validateReservationId } from '../domain/reservationRules.js';
import type { PaymentAttemptStore, ReservationStore } from './ports.js';

export class GetReservation {
  constructor(
    private readonly reservations: Pick<ReservationStore, 'find' | 'expirePending'>,
    private readonly attempts: Pick<PaymentAttemptStore, 'listForReservation'>,
  ) {}

  async execute(id: string, userId: string | undefined): Promise<ReservationView & { paymentAttempts: PaymentAttemptView[] }> {
    const owner = requireIdentity(userId);
    validateReservationId(id);
    requireOwner(await this.reservations.find(id), owner);
    await this.reservations.expirePending();
    const reservation = (await this.reservations.find(id))!;
    return { ...reservation, paymentAttempts: await this.attempts.listForReservation(id) };
  }
}
