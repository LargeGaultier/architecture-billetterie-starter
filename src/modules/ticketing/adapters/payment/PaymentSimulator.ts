import { setTimeout as sleep } from 'node:timers/promises';
import type { PaymentScenario } from '../../domain/models/PaymentScenario.js';
import type { PaymentStatus } from '../../domain/models/PaymentStatus.js';
import type { PaymentGateway } from '../../application/ports/PaymentGateway.js';

export class PaymentSimulator implements PaymentGateway {
  constructor(private readonly slowMs: number) {}

  async run(scenario: PaymentScenario): Promise<PaymentStatus> {
    if (scenario === 'slow') {
      await sleep(this.slowMs);
      return 'PENDING';
    }
    return scenario === 'success' ? 'SUCCEEDED' : 'FAILED';
  }
}
