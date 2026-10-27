import type { Session } from '../../domain/models/Session.js';

export interface SessionStore {
  save(session: Session): Promise<void>;
  find(id: string): Promise<Session | null>;
  revoke(id: string | undefined): Promise<void>;
  removeExpired(now: number): Promise<void>;
}
