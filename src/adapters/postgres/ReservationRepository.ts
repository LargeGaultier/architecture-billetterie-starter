import type { Pool } from 'pg';
import type { ReservationStore } from '../../application/ports/ReservationStore.js';
import type { ReservationStatus } from '../../domain/models/ReservationStatus.js';
import type { Reservation } from '../../domain/models/Reservation.js';

interface ReservationRow {
  id: string;
  event_id: string;
  customer_ref: string;
  status: ReservationStatus;
  created_at: Date;
  expires_at: Date;
}

function toView(row: ReservationRow): Reservation {
  return {
    id: row.id,
    eventId: row.event_id,
    customerRef: row.customer_ref,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
  };
}

export class ReservationRepository implements ReservationStore {
  constructor(private readonly pool: Pool) {}

  async expirePending(): Promise<void> {
    await this.pool.query("UPDATE reservations SET status = 'EXPIRED' WHERE status = 'PENDING' AND expires_at <= now()");
  }

  async create(id: string, eventId: string, customerRef: string, expiresAt: Date): Promise<Reservation> {
    const result = await this.pool.query<ReservationRow>(
      'INSERT INTO reservations (id, event_id, customer_ref, status, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, eventId, customerRef, 'PENDING', expiresAt],
    );
    return toView(result.rows[0]);
  }

  async find(id: string): Promise<Reservation | null> {
    const result = await this.pool.query<ReservationRow>('SELECT * FROM reservations WHERE id = $1', [id]);
    return result.rows[0] ? toView(result.rows[0]) : null;
  }

  async changeStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    const result = await this.pool.query<ReservationRow>('UPDATE reservations SET status = $2 WHERE id = $1 RETURNING *', [id, status]);
    return toView(result.rows[0]);
  }
}
