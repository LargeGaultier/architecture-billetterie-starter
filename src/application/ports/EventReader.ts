import type { EventDto } from '../dto/EventDto.js';

export interface EventReader {
  list(): Promise<readonly EventDto[]>;
  find(id: string): Promise<EventDto | null>;
}
