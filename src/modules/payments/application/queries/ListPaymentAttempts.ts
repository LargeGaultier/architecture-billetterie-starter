import type { QueryHandler } from '../../../../shared/application/ports/QueryHandler.js';
import { paymentRequest } from '../../domain/paymentRules.js';
import { toPaymentAttemptDto, type PaymentAttemptDto } from '../dto/PaymentAttemptDto.js';
import type { PaymentAttemptReader } from '../ports/PaymentAttemptReader.js';
export interface ListPaymentAttemptsQuery { reservationId: string }
export class ListPaymentAttemptsHandler implements QueryHandler<ListPaymentAttemptsQuery, readonly PaymentAttemptDto[]> {
  constructor(private readonly attempts: PaymentAttemptReader) {}
  async execute(query: ListPaymentAttemptsQuery): Promise<readonly PaymentAttemptDto[]> {
    paymentRequest(query.reservationId, 'success');
    return (await this.attempts.listForReservation(query.reservationId)).map(toPaymentAttemptDto);
  }
}
