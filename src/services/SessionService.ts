import { randomBytes } from 'node:crypto';

export interface AuthConfig {
  now?: () => number;
  sessionTtlMs?: number;
  secureCookies?: boolean;
}

export class SessionService {
  private readonly sessions = new Map<string, { userId: string; expiresAt: number }>();
  readonly ttlMs: number;
  private readonly now: () => number;

  constructor(config: AuthConfig = {}) {
    this.ttlMs = config.sessionTtlMs ?? 30 * 60_000;
    this.now = config.now ?? Date.now;
    if (!Number.isFinite(this.ttlMs) || this.ttlMs < 1000) throw new Error('Durée de session invalide.');
  }

  create(userId: string): string {
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= this.now()) this.sessions.delete(id);
    }
    const id = randomBytes(32).toString('hex');
    this.sessions.set(id, { userId, expiresAt: this.now() + this.ttlMs });
    return id;
  }

  userId(id: string | undefined): string | null {
    if (!id) return null;
    const session = this.sessions.get(id);
    return session && session.expiresAt > this.now() ? session.userId : null;
  }

  revoke(id: string | undefined): void {
    if (id) this.sessions.delete(id);
  }
}
