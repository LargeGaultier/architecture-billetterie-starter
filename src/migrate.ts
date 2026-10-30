import { Pool } from 'pg';
import { migrateIdentity } from './modules/identity/setup.js';
import { migrateTicketing } from './modules/ticketing/setup.js';
import { migratePayments } from './modules/payments/setup.js';
import { requiredEnv } from './shared/adapters/system/environment.js';
const service = requiredEnv('SERVICE_NAME');
if (!['identity', 'ticketing', 'payments'].includes(service)) throw new Error('SERVICE_NAME invalide.');
const pool = new Pool({ connectionString: requiredEnv('DATABASE_URL') });
try {
  if (service === 'identity') await migrateIdentity(pool);
  else if (service === 'ticketing') await migrateTicketing(pool);
  else await migratePayments(pool);
  console.log('Données privées prêtes : ' + service);
} finally { await pool.end(); }
