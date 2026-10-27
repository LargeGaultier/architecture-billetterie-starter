import { BusinessError } from '../domain/BusinessError.js';
import type { EventView } from '../domain/models.js';
import type { EventStore, ReservationStore } from './ports.js';

export class GetEvent {
  constructor(private readonly events: Pick<EventStore, 'find'>, private readonly reservations: Pick<ReservationStore, 'expirePending'>) {}
  async execute(id: string): Promise<EventView> {
    await this.reservations.expirePending();
    const event = await this.events.find(id);
    if (!event) throw new BusinessError('EVENT_NOT_FOUND', 'Événement introuvable.');
    return event;
  }
}
