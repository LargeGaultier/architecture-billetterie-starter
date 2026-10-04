import { setTimeout as sleep } from 'node:timers/promises';
import type { PaymentScenario, PaymentStatus } from '../types.js';

export class PaymentSimulator {
  constructor(private readonly slowMs: number) {}

  async run(scenario: PaymentScenario): Promise<PaymentStatus> {
    if (scenario === 'slow') {
      await sleep(this.slowMs);
      return 'PENDING';
    }
    return scenario === 'success' ? 'SUCCEEDED' : 'FAILED';
  }
}
