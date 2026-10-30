import type { PaymentAttempt } from '../../domain/models/PaymentAttempt.js';
export type PaymentAttemptDto = Readonly<PaymentAttempt>;
export function toPaymentAttemptDto(row: PaymentAttempt): PaymentAttemptDto {
  return { id: row.id, reservationId: row.reservationId, scenario: row.scenario, status: row.status, createdAt: row.createdAt };
}
