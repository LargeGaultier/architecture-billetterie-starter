import type { PaymentScenario } from './PaymentScenario.js';
import type { PaymentStatus } from './PaymentStatus.js';

export interface PaymentAttempt {
  id: string;
  reservationId: string;
  scenario: PaymentScenario;
  status: PaymentStatus;
  createdAt: string;
}
