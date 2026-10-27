import type { Pool } from 'pg';
import { hashPassword } from './adapters/auth/passwords.js';

export async function seedUsers(pool: Pool): Promise<void> {
  // Comptes fictifs publics de l'atelier, pas des identifiants de production.
  for (const [id, login, password] of [
    ['user-alice', 'alice', 'Alice-demo-2027!'],
    ['user-bob', 'bob', 'Bob-demo-2027!'],
  ]) {
    const existing = await pool.query('SELECT id FROM users WHERE id=$1 OR login=$2', [id, login]);
    if (existing.rowCount) continue;
    await pool.query('INSERT INTO users (id, login, password_hash) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [id, login, await hashPassword(password)]);
  }
}
