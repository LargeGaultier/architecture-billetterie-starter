import type { PaymentAttempt } from '../../domain/models/PaymentAttempt.js';
import type { Reservation } from '../../domain/models/Reservation.js';
import { paymentScenario, requireIdentity, requireOwner, requirePayable, reservationStatusAfterPayment, validateReservationId } from '../../domain/reservationRules.js';
import type { CommandHandler } from '../../../../shared/application/ports/CommandHandler.js';
import type { IdGenerator } from '../../../../shared/application/ports/IdGenerator.js';
import type { PaymentAttemptStore } from '../ports/PaymentAttemptStore.js';
import type { PaymentGateway } from '../ports/PaymentGateway.js';
import type { ReservationStore } from '../ports/ReservationStore.js';
import type { ExpirePendingReservationsCommand } from './ExpirePendingReservations.js';

export interface CheckoutReservationCommand { reservationId: string; actorId: string | undefined; scenario: string }
export interface CheckoutReservationResult { reservation: Reservation; paymentAttempt: PaymentAttempt }

export class CheckoutReservationHandler implements CommandHandler<CheckoutReservationCommand, CheckoutReservationResult> {
  constructor(
    private readonly reservations: ReservationStore,
    private readonly attempts: PaymentAttemptStore,
    private readonly payment: PaymentGateway,
    private readonly ids: IdGenerator,
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
    let attempt = await this.attempts.create(this.ids.next(), command.reservationId, requestedScenario);
    const result = await this.payment.run(requestedScenario);
    const nextStatus = reservationStatusAfterPayment(result);
    if (nextStatus) {
      attempt = await this.attempts.changeStatus(attempt.id, result);
      return { reservation: await this.reservations.changeStatus(command.reservationId, nextStatus), paymentAttempt: attempt };
    }
    return { reservation, paymentAttempt: attempt };
  }
}
