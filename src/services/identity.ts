import { Pool } from 'pg';
import { createIdentityModule, buildIdentityHttpApp } from '../modules/identity/index.js';
import { numberFromEnv, requiredEnv } from '../shared/adapters/system/environment.js';
import { serve } from '../shared/adapters/system/serve.js';
const pool = new Pool({ connectionString: requiredEnv('DATABASE_URL') });
const options = { sessionTtlMs: numberFromEnv('SESSION_TTL_MS', 30 * 60_000, 1), secureCookies: process.env.AUTH_COOKIE_SECURE === 'true' };
const app = buildIdentityHttpApp(createIdentityModule(pool, options), options, async () => { await pool.query('SELECT 1'); });
app.addHook('onClose', async () => { await pool.end(); });
await serve(app);
