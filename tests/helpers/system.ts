import { after } from 'node:test';
import { Pool } from 'pg';
import { buildGatewayApp } from '../../src/app.js';
import { createIdentityModule, buildIdentityHttpApp, type IdentityConfig } from '../../src/modules/identity/index.js';
import { createPaymentsModule, buildPaymentsHttpApp } from '../../src/modules/payments/index.js';
import { createTicketingModule, buildTicketingHttpApp, createSessionActor, PaymentHttpClient, type TicketingConfig } from '../../src/modules/ticketing/index.js';

export const identityPool = new Pool({ connectionString: process.env.IDENTITY_DATABASE_URL });
export const paymentPool = new Pool({ connectionString: process.env.PAYMENTS_DATABASE_URL });
after(async () => { await identityPool.end(); await paymentPool.end(); });
export async function resetData(pool: Pool) { await paymentPool.query('TRUNCATE payment_attempts'); await pool.query('TRUNCATE reservations'); }

// Vrais échanges HTTP localhost et trois bases privées, sans assemblage monolithique.
export function buildApp(pool: Pool, config: TicketingConfig, auth: IdentityConfig & { secureCookies?: boolean } = {}) {
  const token = 'tp7-test-service-secret-at-least-32';
  const options = { secureCookies: auth.secureCookies ?? false, sessionTtlMs: auth.sessionTtlMs ?? 30 * 60_000 };
  const identity = buildIdentityHttpApp(createIdentityModule(identityPool, auth), options, async () => { await identityPool.query('SELECT 1'); });
  const payments = buildPaymentsHttpApp(createPaymentsModule(paymentPool, config.paymentSlowMs), token, async () => { await paymentPool.query('SELECT 1'); });
  const upstreams = { identityUrl: '', ticketingUrl: '', timeoutMs: 7000 };
  const app = buildGatewayApp(upstreams);
  let ticketing: ReturnType<typeof buildTicketingHttpApp> | undefined;
  app.addHook('onReady', async () => {
    upstreams.identityUrl = await identity.listen({ host: '127.0.0.1', port: 0 });
    const paymentUrl = await payments.listen({ host: '127.0.0.1', port: 0 });
    ticketing = buildTicketingHttpApp(createTicketingModule(pool, config, new PaymentHttpClient(paymentUrl, token, 3500)),
      createSessionActor(upstreams.identityUrl, 1000), async () => { await pool.query('SELECT 1'); });
    upstreams.ticketingUrl = await ticketing.listen({ host: '127.0.0.1', port: 0 });
  });
  app.addHook('onClose', async () => { await ticketing?.close(); await payments.close(); await identity.close(); });
  return app;
}
