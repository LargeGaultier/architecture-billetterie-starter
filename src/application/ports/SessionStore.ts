import type { Session } from '../../domain/models/Session.js';
import type { SessionRevoker } from './SessionRevoker.js';

export interface SessionStore extends SessionRevoker {
  save(session: Session): Promise<void>;
  removeExpired(now: number): Promise<void>;
}
