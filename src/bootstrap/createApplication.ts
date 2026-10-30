import type { Pool } from 'pg';
import type { Application } from '../contracts/Application.js';
import { createIdentityModule } from '../modules/identity/index.js';
import { createTicketingModule } from '../modules/ticketing/index.js';
import { createPaymentsModule } from '../modules/payments/index.js';
import type { AuthConfig, TicketingConfig } from './config.js';

export function createApplication(pool: Pool, config: TicketingConfig, authConfig: AuthConfig = {}): Application {
  const payment = createPaymentsModule(pool, config.paymentSlowMs);
  return {
    identity: createIdentityModule(pool, authConfig),
    ticketing: createTicketingModule(pool, config, {
      pay: (reservationId, scenario) => payment.commands.processPayment.execute({ reservationId, scenario }),
      listForReservation: async reservationId => [...await payment.queries.listPaymentAttempts.execute({ reservationId })],
    }),
  };
}
