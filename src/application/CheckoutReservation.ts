import type { PaymentAttemptView, ReservationView } from '../domain/models.js';
import { paymentScenario, requireIdentity, requireOwner, requirePayable, reservationStatusAfterPayment, validateReservationId } from '../domain/reservationRules.js';
import type { IdGenerator, PaymentAttemptStore, PaymentGateway, ReservationStore } from './ports.js';

export class CheckoutReservation {
  constructor(
    private readonly reservations: Pick<ReservationStore, 'find' | 'expirePending' | 'changeStatus'>,
    private readonly attempts: Pick<PaymentAttemptStore, 'create' | 'changeStatus'>,
    private readonly payment: PaymentGateway,
    private readonly ids: IdGenerator,
  ) {}

  async execute(id: string, userId: string | undefined, scenario: string): Promise<{ reservation: ReservationView; paymentAttempt: PaymentAttemptView }> {
    const owner = requireIdentity(userId);
    validateReservationId(id);
    requireOwner(await this.reservations.find(id), owner);
    const requestedScenario = paymentScenario(scenario);
    await this.reservations.expirePending();
    const reservation = (await this.reservations.find(id))!;
    requirePayable(reservation);
    let attempt = await this.attempts.create(this.ids.next(), id, requestedScenario);
    const result = await this.payment.run(requestedScenario);
    const nextStatus = reservationStatusAfterPayment(result);
    if (nextStatus) {
      attempt = await this.attempts.changeStatus(attempt.id, result);
      return { reservation: await this.reservations.changeStatus(id, nextStatus), paymentAttempt: attempt };
    }
    return { reservation, paymentAttempt: attempt };
  }
}
