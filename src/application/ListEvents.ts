import type { EventView } from '../domain/models.js';
import type { EventStore, ReservationStore } from './ports.js';

export class ListEvents {
  constructor(private readonly events: Pick<EventStore, 'list'>, private readonly reservations: Pick<ReservationStore, 'expirePending'>) {}
  async execute(): Promise<EventView[]> {
    await this.reservations.expirePending();
    return this.events.list();
  }
}
