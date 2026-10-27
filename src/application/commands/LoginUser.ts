import { BusinessError } from '../../domain/BusinessError.js';
import { toUserDto, type UserDto } from '../dto/UserDto.js';
import type { Clock } from '../ports/Clock.js';
import type { CommandHandler } from '../ports/CommandHandler.js';
import type { IdGenerator } from '../ports/IdGenerator.js';
import type { PasswordVerifier } from '../ports/PasswordVerifier.js';
import type { SessionStore } from '../ports/SessionStore.js';
import type { UserStore } from '../ports/UserStore.js';

export interface LoginUserCommand { login: unknown; password: unknown; previousSessionId?: string }
export interface LoginUserResult { user: UserDto; sessionId: string }

export class LoginUserHandler implements CommandHandler<LoginUserCommand, LoginUserResult> {
  constructor(
    private readonly users: UserStore,
    private readonly passwords: PasswordVerifier,
    private readonly sessions: SessionStore,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly ttlMs: number,
  ) {
    if (!Number.isFinite(ttlMs) || ttlMs < 1000) throw new Error('Durée de session invalide.');
  }

  async execute(command: LoginUserCommand): Promise<LoginUserResult> {
    if (typeof command.login !== 'string' || typeof command.password !== 'string' ||
        !command.login.trim() || command.login.length > 80 || !command.password || command.password.length > 1024) {
      throw new BusinessError('INVALID_CREDENTIALS', 'Identifiants incorrects.');
    }
    const user = await this.users.findByLogin(command.login.trim());
    const valid = await this.passwords.verify(command.password, user?.passwordHash ?? null);
    if (!user || !valid) throw new BusinessError('INVALID_CREDENTIALS', 'Identifiants incorrects.');
    const now = this.clock.now();
    await this.sessions.removeExpired(now);
    const sessionId = this.ids.next();
    await this.sessions.save({ id: sessionId, userId: user.id, expiresAt: now + this.ttlMs });
    await this.sessions.revoke(command.previousSessionId);
    return { user: toUserDto(user), sessionId };
  }
}
