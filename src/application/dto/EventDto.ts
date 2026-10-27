import type { EventStatus } from '../../domain/models/EventStatus.js';

export interface EventDto {
  readonly id: string;
  readonly title: string;
  readonly venue: string;
  readonly startsAt: string;
  readonly capacity: number;
  readonly available: number;
  readonly status: EventStatus;
}

export function toEventDto(event: EventDto): EventDto {
  return { id: event.id, title: event.title, venue: event.venue, startsAt: event.startsAt,
    capacity: event.capacity, available: event.available, status: event.status };
}
