import type { Pool } from 'pg';
import type { UserAccount, UserView } from '../domain/models.js';
import type { UserStore } from '../application/ports.js';

interface UserRow { id: string; login: string; password_hash: string }

export class UserRepository implements UserStore {
  constructor(private readonly pool: Pool) {}

  async findByLogin(login: string): Promise<UserAccount | null> {
    const result = await this.pool.query<UserRow>('SELECT id, login, password_hash FROM users WHERE login=$1', [login]);
    const row = result.rows[0];
    return row ? { id: row.id, login: row.login, passwordHash: row.password_hash } : null;
  }

  async findById(id: string): Promise<UserView | null> {
    const result = await this.pool.query<UserView>('SELECT id, login FROM users WHERE id=$1', [id]);
    return result.rows[0] ?? null;
  }
}
