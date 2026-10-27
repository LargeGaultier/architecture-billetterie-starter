import type { UserAccount } from '../../domain/models/UserAccount.js';

export interface UserStore {
  findByLogin(login: string): Promise<UserAccount | null>;
}
