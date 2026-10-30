import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
export async function migrateTicketing(pool: Pool): Promise<void> {
  await pool.query(await readFile('db/ticketing/001_init.sql', 'utf8'));
  await pool.query(await readFile('db/ticketing/002_demo.sql', 'utf8'));
}
