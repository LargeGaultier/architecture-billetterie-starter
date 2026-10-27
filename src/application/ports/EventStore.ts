import type { Event } from '../../domain/models/Event.js';

export interface EventStore {
  list(): Promise<Event[]>;
  find(id: string): Promise<Event | null>;
}
