import { Pool } from 'pg';
import { createTicketingModule, buildTicketingHttpApp, createSessionActor, PaymentHttpClient } from '../modules/ticketing/index.js';
import { numberFromEnv, requiredEnv } from '../shared/adapters/system/environment.js';
import { serve } from '../shared/adapters/system/serve.js';
const pool = new Pool({ connectionString: requiredEnv('DATABASE_URL') });
const payment = new PaymentHttpClient(requiredEnv('PAYMENTS_URL'), requiredEnv('PAYMENTS_SERVICE_TOKEN'), numberFromEnv('PAYMENTS_TIMEOUT_MS', 3500, 1));
const api = createTicketingModule(pool, {
  reservationTtlMinutes: numberFromEnv('RESERVATION_TTL_MINUTES', 15, 1),
  reservationHoldMs: numberFromEnv('LAB_RESERVATION_PAUSE_MS', 75),
}, payment);
const app = buildTicketingHttpApp(api, createSessionActor(requiredEnv('IDENTITY_URL'), numberFromEnv('IDENTITY_TIMEOUT_MS', 1000, 1)), async () => { await pool.query('SELECT 1'); });
app.addHook('onClose', async () => { await pool.end(); });
await serve(app);
