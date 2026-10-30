import { Pool } from 'pg';
import { createPaymentsModule, buildPaymentsHttpApp } from '../modules/payments/index.js';
import { numberFromEnv, requiredEnv } from '../shared/adapters/system/environment.js';
import { serve } from '../shared/adapters/system/serve.js';
const pool = new Pool({ connectionString: requiredEnv('DATABASE_URL') });
const app = buildPaymentsHttpApp(createPaymentsModule(pool, numberFromEnv('PAYMENT_SLOW_MS', 2000)), requiredEnv('PAYMENTS_SERVICE_TOKEN'), async () => { await pool.query('SELECT 1'); });
app.addHook('onClose', async () => { await pool.end(); });
await serve(app);
