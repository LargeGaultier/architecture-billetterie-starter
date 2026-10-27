import { BusinessError } from '../domain/BusinessError.js';
import type { User } from '../domain/models/User.js';
import type { Clock } from './ports/Clock.js';
import type { IdGenerator } from './ports/IdGenerator.js';
import type { PasswordVerifier } from './ports/PasswordVerifier.js';
import type { SessionStore } from './ports/SessionStore.js';
import type { UserStore } from './ports/UserStore.js';

export class Login {
  constructor(
    private readonly users: Pick<UserStore, 'findByLogin'>,
    private readonly passwords: PasswordVerifier,
    private readonly sessions: Pick<SessionStore, 'save' | 'revoke' | 'removeExpired'>,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly ttlMs: number,
  ) {
    if (!Number.isFinite(ttlMs) || ttlMs < 1000) throw new Error('Durée de session invalide.');
  }

  async execute(login: unknown, password: unknown, previousSessionId?: string): Promise<{ user: User; sessionId: string }> {
    if (typeof login !== 'string' || typeof password !== 'string' ||
        !login.trim() || login.length > 80 || !password || password.length > 1024) {
      throw new BusinessError('INVALID_CREDENTIALS', 'Identifiants incorrects.');
    }
    const user = await this.users.findByLogin(login.trim());
    const valid = await this.passwords.verify(password, user?.passwordHash ?? null);
    if (!user || !valid) throw new BusinessError('INVALID_CREDENTIALS', 'Identifiants incorrects.');
    const now = this.clock.now();
    await this.sessions.removeExpired(now);
    const sessionId = this.ids.next();
    await this.sessions.save({ id: sessionId, userId: user.id, expiresAt: now + this.ttlMs });
    await this.sessions.revoke(previousSessionId);
    return { user: { id: user.id, login: user.login }, sessionId };
  }
}
