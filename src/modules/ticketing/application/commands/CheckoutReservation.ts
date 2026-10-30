import type { PaymentAttempt } from '../../domain/models/PaymentAttempt.js';
import type { Reservation } from '../../domain/models/Reservation.js';
import { paymentScenario, requireIdentity, requireOwner, requirePayable, reservationStatusAfterPayment, validateReservationId } from '../../domain/reservationRules.js';
import type { CommandHandler } from '../../../../shared/application/ports/CommandHandler.js';
import type { PaymentProcessor } from '../ports/PaymentProcessor.js';
import type { ReservationStore } from '../ports/ReservationStore.js';
import type { ExpirePendingReservationsCommand } from './ExpirePendingReservations.js';

export interface CheckoutReservationCommand { reservationId: string; actorId: string | undefined; scenario: string }
export interface CheckoutReservationResult { reservation: Reservation; paymentAttempt: PaymentAttempt }

export class CheckoutReservationHandler implements CommandHandler<CheckoutReservationCommand, CheckoutReservationResult> {
  constructor(
    private readonly reservations: ReservationStore,
    private readonly payment: PaymentProcessor,
    private readonly expiration: CommandHandler<ExpirePendingReservationsCommand, void>,
  ) {}

  async execute(command: CheckoutReservationCommand): Promise<CheckoutReservationResult> {
    const owner = requireIdentity(command.actorId);
    validateReservationId(command.reservationId);
    requireOwner(await this.reservations.find(command.reservationId), owner);
    const requestedScenario = paymentScenario(command.scenario);
    await this.expiration.execute({});
    const reservation = (await this.reservations.find(command.reservationId))!;
    requirePayable(reservation);
    const attempt = await this.payment.pay(command.reservationId, requestedScenario);
    const nextStatus = reservationStatusAfterPayment(attempt.status);
    if (nextStatus) {
      return { reservation: await this.reservations.changeStatus(command.reservationId, nextStatus), paymentAttempt: attempt };
    }
    return { reservation, paymentAttempt: attempt };
  }
}
