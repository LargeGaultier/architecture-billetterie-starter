import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { PaymentsApi } from '../contracts/PaymentsApi.js';
import { ProcessPaymentHandler } from '../application/commands/ProcessPayment.js';
import { ListPaymentAttemptsHandler } from '../application/queries/ListPaymentAttempts.js';
import { PaymentSimulator } from '../adapters/payment/PaymentSimulator.js';
import { PaymentAttemptRepository } from '../adapters/postgres/PaymentAttemptRepository.js';
export function createPaymentsModule(pool: Pool, slowMs: number): PaymentsApi {
  const attempts = new PaymentAttemptRepository(pool);
  return {
    commands: { processPayment: new ProcessPaymentHandler(attempts, new PaymentSimulator(slowMs), { next: randomUUID }) },
    queries: { listPaymentAttempts: new ListPaymentAttemptsHandler(attempts) },
  };
}
