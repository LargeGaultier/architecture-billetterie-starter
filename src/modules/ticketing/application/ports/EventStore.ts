import type { Event } from '../../domain/models/Event.js';

export interface EventStore {
  find(id: string): Promise<Event | null>;
}
