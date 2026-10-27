import type { SessionStore } from '../../application/ports.js';
import type { Session } from '../../domain/models.js';

export class MemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  async save(session: Session): Promise<void> { this.sessions.set(session.id, { ...session }); }

  async find(id: string): Promise<Session | null> {
    const session = this.sessions.get(id);
    return session ? { ...session } : null;
  }

  async revoke(id: string | undefined): Promise<void> { if (id) this.sessions.delete(id); }

  async removeExpired(now: number): Promise<void> {
    for (const [id, session] of this.sessions) if (session.expiresAt <= now) this.sessions.delete(id);
  }
}
