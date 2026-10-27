import type { PaymentScenario } from '../../domain/models/PaymentScenario.js';
import type { PaymentStatus } from '../../domain/models/PaymentStatus.js';

export interface PaymentGateway {
  run(scenario: PaymentScenario): Promise<PaymentStatus>;
}
