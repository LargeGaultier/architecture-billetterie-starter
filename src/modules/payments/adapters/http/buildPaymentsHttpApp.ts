import { timingSafeEqual } from 'node:crypto';
import type { PaymentsApi } from '../../contracts/PaymentsApi.js';
import { createHttpApp } from '../../../../shared/adapters/http/createHttpApp.js';
import { asRecord } from '../../../../shared/adapters/http/asRecord.js';
import { BusinessError } from '../../../../shared/domain/BusinessError.js';

export function buildPaymentsHttpApp(payments: PaymentsApi, serviceToken: string, healthcheck: () => Promise<void>) {
  if (serviceToken.length < 32) throw new Error('PAYMENTS_SERVICE_TOKEN doit contenir au moins 32 caractères.');
  const app = createHttpApp(healthcheck);
  app.addHook('onRequest', async request => {
    if (request.url === '/health') return;
    const supplied = request.headers['x-service-token'];
    const actual = Buffer.from(typeof supplied === 'string' ? supplied : '');
    const expected = Buffer.from(serviceToken);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new BusinessError('AUTH_REQUIRED', 'Authentification de service requise.');
    }
  });
  app.post('/internal/payments', async request => {
    const body = asRecord(request.body);
    return { paymentAttempt: await payments.commands.processPayment.execute({
      reservationId: typeof body.reservationId === 'string' ? body.reservationId : '',
      scenario: typeof body.scenario === 'string' ? body.scenario : '',
    }) };
  });
  app.get<{ Params: { id: string } }>('/internal/reservations/:id/payments', async request => ({
    paymentAttempts: await payments.queries.listPaymentAttempts.execute({ reservationId: request.params.id }),
  }));
  return app;
}
