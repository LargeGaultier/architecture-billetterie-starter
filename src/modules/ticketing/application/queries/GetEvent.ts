import { BusinessError } from '../../../../shared/domain/BusinessError.js';
import { toEventDto, type EventDto } from '../dto/EventDto.js';
import type { EventReader } from '../ports/EventReader.js';
import type { QueryHandler } from '../../../../shared/application/ports/QueryHandler.js';

export interface GetEventQuery { eventId: string }
export type GetEventResult = EventDto;

export class GetEventHandler implements QueryHandler<GetEventQuery, GetEventResult> {
  constructor(private readonly events: EventReader) {}
  async execute(query: GetEventQuery): Promise<GetEventResult> {
    const event = await this.events.find(query.eventId);
    if (!event) throw new BusinessError('EVENT_NOT_FOUND', 'Événement introuvable.');
    return toEventDto(event);
  }
}
