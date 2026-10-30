import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
export async function migratePayments(pool: Pool): Promise<void> {
  await pool.query(await readFile('db/payments/001_init.sql', 'utf8'));
}
