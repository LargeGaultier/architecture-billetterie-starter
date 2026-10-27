import type { User } from '../../domain/models/User.js';
import type { UserAccount } from '../../domain/models/UserAccount.js';

export interface UserStore {
  findByLogin(login: string): Promise<UserAccount | null>;
  findById(id: string): Promise<User | null>;
}
