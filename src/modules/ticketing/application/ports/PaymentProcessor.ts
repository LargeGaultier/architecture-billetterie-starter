import type { PaymentAttempt } from '../../domain/models/PaymentAttempt.js';
import type { PaymentScenario } from '../../domain/models/PaymentScenario.js';
export interface PaymentProcessor {
  pay(reservationId: string, scenario: PaymentScenario): Promise<PaymentAttempt>;
}
