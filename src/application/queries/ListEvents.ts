import { toEventDto, type EventDto } from '../dto/EventDto.js';
import type { EventReader } from '../ports/EventReader.js';
import type { QueryHandler } from '../ports/QueryHandler.js';

export type ListEventsQuery = Record<string, never>;
export type ListEventsResult = readonly EventDto[];

export class ListEventsHandler implements QueryHandler<ListEventsQuery, ListEventsResult> {
  constructor(private readonly events: EventReader) {}
  async execute(_query: ListEventsQuery): Promise<ListEventsResult> {
    return (await this.events.list()).map(toEventDto);
  }
}
