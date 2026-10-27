import type { EventStatus } from './EventStatus.js';

export interface Event {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  capacity: number;
  available: number;
  status: EventStatus;
}
