import type { CommandHandler } from '../../../../shared/application/ports/CommandHandler.js';
import type { IdGenerator } from '../../../../shared/application/ports/IdGenerator.js';
import { paymentRequest } from '../../domain/paymentRules.js';
import { toPaymentAttemptDto, type PaymentAttemptDto } from '../dto/PaymentAttemptDto.js';
import type { PaymentAttemptStore } from '../ports/PaymentAttemptStore.js';
import type { PaymentGateway } from '../ports/PaymentGateway.js';
export interface ProcessPaymentCommand { reservationId: string; scenario: string }
export class ProcessPaymentHandler implements CommandHandler<ProcessPaymentCommand, PaymentAttemptDto> {
  constructor(private readonly attempts: PaymentAttemptStore, private readonly simulator: PaymentGateway, private readonly ids: IdGenerator) {}
  async execute(command: ProcessPaymentCommand): Promise<PaymentAttemptDto> {
    const scenario = paymentRequest(command.reservationId, command.scenario);
    let attempt = await this.attempts.create(this.ids.next(), command.reservationId, scenario);
    const result = await this.simulator.run(scenario);
    if (result !== 'PENDING') attempt = await this.attempts.changeStatus(attempt.id, result);
    return toPaymentAttemptDto(attempt);
  }
}
