import type { Pool } from 'pg';
import type { UserAccount } from '../../domain/models/UserAccount.js';
import type { User } from '../../domain/models/User.js';
import type { UserStore } from '../../application/ports/UserStore.js';

interface UserRow { id: string; login: string; password_hash: string }

export class UserRepository implements UserStore {
  constructor(private readonly pool: Pool) {}

  async findByLogin(login: string): Promise<UserAccount | null> {
    const result = await this.pool.query<UserRow>('SELECT id, login, password_hash FROM users WHERE login=$1', [login]);
    const row = result.rows[0];
    return row ? { id: row.id, login: row.login, passwordHash: row.password_hash } : null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query<User>('SELECT id, login FROM users WHERE id=$1', [id]);
    return result.rows[0] ?? null;
  }
}
