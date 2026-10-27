import { BusinessError } from '../domain/BusinessError.js';
import type { Event } from '../domain/models/Event.js';
import type { EventStore } from './ports/EventStore.js';
import type { ReservationStore } from './ports/ReservationStore.js';

export class GetEvent {
  constructor(private readonly events: Pick<EventStore, 'find'>, private readonly reservations: Pick<ReservationStore, 'expirePending'>) {}
  async execute(id: string): Promise<Event> {
    await this.reservations.expirePending();
    const event = await this.events.find(id);
    if (!event) throw new BusinessError('EVENT_NOT_FOUND', 'Événement introuvable.');
    return event;
  }
}
