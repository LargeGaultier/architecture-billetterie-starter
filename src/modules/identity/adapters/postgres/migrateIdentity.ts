import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
import { seedUsers } from './seedUsers.js';
export async function migrateIdentity(pool: Pool): Promise<void> {
  await pool.query(await readFile('db/identity/001_init.sql', 'utf8'));
  await seedUsers(pool);
}
