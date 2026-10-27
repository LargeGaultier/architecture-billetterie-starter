import type { Event } from '../domain/models/Event.js';
import type { EventStore } from './ports/EventStore.js';
import type { ReservationStore } from './ports/ReservationStore.js';

export class ListEvents {
  constructor(private readonly events: Pick<EventStore, 'list'>, private readonly reservations: Pick<ReservationStore, 'expirePending'>) {}
  async execute(): Promise<Event[]> {
    await this.reservations.expirePending();
    return this.events.list();
  }
}
