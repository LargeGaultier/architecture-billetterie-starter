import { AppError } from '../errors.js';
import { verifyPassword } from '../passwords.js';
import { UserRepository } from '../repositories/UserRepository.js';
import type { UserView } from '../types.js';
import { SessionService } from './SessionService.js';

// Le même calcul est effectué pour un login inconnu, sans stocker de mot de passe.
const dummyHash = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;

export class AuthService {
  constructor(private readonly users: UserRepository, private readonly sessions: SessionService) {}

  async login(login: unknown, password: unknown): Promise<{ user: UserView; sessionId: string }> {
    if (typeof login !== 'string' || typeof password !== 'string' ||
        !login.trim() || login.length > 80 || !password || password.length > 1024) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Identifiants incorrects.');
    }
    const user = await this.users.findByLogin(login.trim());
    const valid = await verifyPassword(password, user?.password_hash ?? dummyHash);
    if (!user || !valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Identifiants incorrects.');
    return { user: { id: user.id, login: user.login }, sessionId: this.sessions.create(user.id) };
  }

  async currentUser(sessionId: string | undefined): Promise<UserView> {
    const userId = this.sessions.userId(sessionId);
    const user = userId ? await this.users.findById(userId) : null;
    if (!user) throw new AppError(401, 'AUTH_REQUIRED', 'Connectez-vous pour continuer.');
    return user;
  }

  logout(sessionId: string | undefined): void { this.sessions.revoke(sessionId); }
}
