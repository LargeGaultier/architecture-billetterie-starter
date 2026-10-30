import type { CommandHandler } from '../../../shared/application/ports/CommandHandler.js';
import type { QueryHandler } from '../../../shared/application/ports/QueryHandler.js';
import type { ProcessPaymentCommand } from '../application/commands/ProcessPayment.js';
import type { ListPaymentAttemptsQuery } from '../application/queries/ListPaymentAttempts.js';
import type { PaymentAttemptDto } from '../application/dto/PaymentAttemptDto.js';
export interface PaymentsApi {
  commands: { processPayment: CommandHandler<ProcessPaymentCommand, PaymentAttemptDto> };
  queries: { listPaymentAttempts: QueryHandler<ListPaymentAttemptsQuery, readonly PaymentAttemptDto[]> };
}
