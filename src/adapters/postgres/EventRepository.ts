import type { Pool } from 'pg';
import type { EventStore } from '../../application/ports/EventStore.js';
import type { EventStatus } from '../../domain/models/EventStatus.js';
import type { Event } from '../../domain/models/Event.js';

interface EventRow {
  id: string;
  title: string;
  venue: string;
  starts_at: Date;
  capacity: number;
  available: number;
  status: EventStatus;
}

const availabilitySql = `
  SELECT e.id, e.title, e.venue, e.starts_at, e.capacity, e.status,
         e.capacity - (
           SELECT count(*)::int FROM reservations r
           WHERE r.event_id = e.id
             AND (r.status = 'CONFIRMED' OR (r.status = 'PENDING' AND r.expires_at > now()))
         ) AS available
  FROM events e`;

function toView(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    venue: row.venue,
    startsAt: row.starts_at.toISOString(),
    capacity: row.capacity,
    available: row.available,
    status: row.status,
  };
}

export class EventRepository implements EventStore {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<Event[]> {
    const result = await this.pool.query<EventRow>(`${availabilitySql} ORDER BY e.starts_at, e.id`);
    return result.rows.map(toView);
  }

  async find(id: string): Promise<Event | null> {
    const result = await this.pool.query<EventRow>(`${availabilitySql} WHERE e.id = $1`, [id]);
    return result.rows[0] ? toView(result.rows[0]) : null;
  }
}
