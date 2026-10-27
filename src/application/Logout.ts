import type { SessionStore } from './ports.js';

export class Logout {
  constructor(private readonly sessions: Pick<SessionStore, 'revoke'>) {}
  async execute(sessionId: string | undefined): Promise<void> { await this.sessions.revoke(sessionId); }
}
