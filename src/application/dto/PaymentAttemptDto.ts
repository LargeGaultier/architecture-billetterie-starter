import type { PaymentScenario } from '../../domain/models/PaymentScenario.js';
import type { PaymentStatus } from '../../domain/models/PaymentStatus.js';

export interface PaymentAttemptDto {
  readonly id: string;
  readonly reservationId: string;
  readonly scenario: PaymentScenario;
  readonly status: PaymentStatus;
  readonly createdAt: string;
}

export function toPaymentAttemptDto(attempt: PaymentAttemptDto): PaymentAttemptDto {
  return { id: attempt.id, reservationId: attempt.reservationId, scenario: attempt.scenario,
    status: attempt.status, createdAt: attempt.createdAt };
}
