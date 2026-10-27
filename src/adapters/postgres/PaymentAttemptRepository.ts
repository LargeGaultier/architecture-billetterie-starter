import type { Pool } from 'pg';
import type { PaymentAttemptStore } from '../../application/ports/PaymentAttemptStore.js';
import type { PaymentAttemptReader } from '../../application/ports/PaymentAttemptReader.js';
import type { PaymentAttempt } from '../../domain/models/PaymentAttempt.js';
import type { PaymentScenario } from '../../domain/models/PaymentScenario.js';
import type { PaymentStatus } from '../../domain/models/PaymentStatus.js';

interface AttemptRow {
  id: string;
  reservation_id: string;
  scenario: PaymentScenario;
  status: PaymentStatus;
  created_at: Date;
}

function toView(row: AttemptRow): PaymentAttempt {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    scenario: row.scenario,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

export class PaymentAttemptRepository implements PaymentAttemptStore, PaymentAttemptReader {
  constructor(private readonly pool: Pool) {}

  async create(id: string, reservationId: string, scenario: PaymentScenario): Promise<PaymentAttempt> {
    const result = await this.pool.query<AttemptRow>(
      'INSERT INTO payment_attempts (id, reservation_id, scenario, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, reservationId, scenario, 'PENDING'],
    );
    return toView(result.rows[0]);
  }

  async changeStatus(id: string, status: PaymentStatus): Promise<PaymentAttempt> {
    const result = await this.pool.query<AttemptRow>('UPDATE payment_attempts SET status = $2 WHERE id = $1 RETURNING *', [id, status]);
    return toView(result.rows[0]);
  }

  async listForReservation(reservationId: string): Promise<PaymentAttempt[]> {
    const result = await this.pool.query<AttemptRow>(
      'SELECT * FROM payment_attempts WHERE reservation_id = $1 ORDER BY created_at, id',
      [reservationId],
    );
    return result.rows.map(toView);
  }
}
