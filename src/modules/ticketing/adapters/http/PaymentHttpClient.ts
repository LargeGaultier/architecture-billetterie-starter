import type { PaymentProcessor } from '../../application/ports/PaymentProcessor.js';
import type { PaymentAttemptReader } from '../../application/ports/PaymentAttemptReader.js';
import type { PaymentAttempt } from '../../domain/models/PaymentAttempt.js';
import type { PaymentScenario } from '../../domain/models/PaymentScenario.js';
import { record, requestJson } from '../../../../shared/adapters/http/requestJson.js';

function parseAttempt(value: unknown, reservationId: string, scenario?: PaymentScenario): PaymentAttempt {
  const row = record(value);
  if (typeof row.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)
    || row.reservationId !== reservationId || typeof row.scenario !== 'string' || !['success', 'failure', 'slow'].includes(row.scenario)
    || (scenario !== undefined && row.scenario !== scenario) || typeof row.status !== 'string' || !['PENDING', 'SUCCEEDED', 'FAILED'].includes(row.status)
    || typeof row.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(row.createdAt)
    || !Number.isFinite(Date.parse(row.createdAt))) throw new Error('Contrat Paiement invalide.');
  return { id: row.id, reservationId, scenario: row.scenario as PaymentAttempt['scenario'],
    status: row.status as PaymentAttempt['status'], createdAt: row.createdAt };
}

export class PaymentHttpClient implements PaymentProcessor, PaymentAttemptReader {
  constructor(private readonly url: string, private readonly token: string, private readonly timeoutMs: number) {}
  async pay(reservationId: string, scenario: PaymentScenario): Promise<PaymentAttempt> {
    reservationId = reservationId.toLowerCase();
    const body = await requestJson(this.url + '/internal/payments', this.timeoutMs, { token: this.token, body: { reservationId, scenario } });
    return parseAttempt(record(body).paymentAttempt, reservationId, scenario);
  }
  async listForReservation(reservationId: string): Promise<PaymentAttempt[]> {
    reservationId = reservationId.toLowerCase();
    const body = await requestJson(this.url + `/internal/reservations/${encodeURIComponent(reservationId)}/payments`, this.timeoutMs, { token: this.token });
    const rows = record(body).paymentAttempts;
    if (!Array.isArray(rows)) throw new Error('Contrat historique Paiement invalide.');
    return rows.map(row => parseAttempt(row, reservationId));
  }
}
