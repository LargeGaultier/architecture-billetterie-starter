import type { Session } from '../../domain/models/Session.js';

export interface SessionReader {
  find(id: string): Promise<Session | null>;
}
