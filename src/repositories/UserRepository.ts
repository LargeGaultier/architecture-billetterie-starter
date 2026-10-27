import type { Pool } from 'pg';
import type { UserView } from '../types.js';

interface UserRow { id: string; login: string; password_hash: string }

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByLogin(login: string): Promise<UserRow | null> {
    const result = await this.pool.query<UserRow>('SELECT id, login, password_hash FROM users WHERE login=$1', [login]);
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<UserView | null> {
    const result = await this.pool.query<UserView>('SELECT id, login FROM users WHERE id=$1', [id]);
    return result.rows[0] ?? null;
  }
}
