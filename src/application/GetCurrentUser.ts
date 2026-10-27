import { BusinessError } from '../domain/BusinessError.js';
import type { UserView } from '../domain/models.js';
import type { Clock, SessionStore, UserStore } from './ports.js';

export class GetCurrentUser {
  constructor(
    private readonly sessions: Pick<SessionStore, 'find'>,
    private readonly users: Pick<UserStore, 'findById'>,
    private readonly clock: Clock,
  ) {}

  async execute(sessionId: string | undefined): Promise<UserView> {
    const session = sessionId ? await this.sessions.find(sessionId) : null;
    const user = session && session.expiresAt > this.clock.now() ? await this.users.findById(session.userId) : null;
    if (!user) throw new BusinessError('AUTH_REQUIRED', 'Connectez-vous pour continuer.');
    return user;
  }
}
