import type { PaymentAttempt } from '../../domain/models/PaymentAttempt.js';
import type { PaymentScenario } from '../../domain/models/PaymentScenario.js';
import type { PaymentStatus } from '../../domain/models/PaymentStatus.js';

export interface PaymentAttemptStore {
  create(id: string, reservationId: string, scenario: PaymentScenario): Promise<PaymentAttempt>;
  changeStatus(id: string, status: PaymentStatus): Promise<PaymentAttempt>;
  listForReservation(id: string): Promise<PaymentAttempt[]>;
}
