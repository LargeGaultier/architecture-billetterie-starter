import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProcessPaymentHandler } from '../../application/commands/ProcessPayment.js';
import { ListPaymentAttemptsHandler } from '../../application/queries/ListPaymentAttempts.js';
import type { PaymentAttempt } from '../../domain/models/PaymentAttempt.js';
import type { PaymentStatus } from '../../domain/models/PaymentStatus.js';
import type { PaymentAttemptStore } from '../../application/ports/PaymentAttemptStore.js';
import type { PaymentAttemptReader } from '../../application/ports/PaymentAttemptReader.js';

function fixture(result: PaymentStatus = 'SUCCEEDED') {
  const effects: string[] = [];
  const row: PaymentAttempt = { id: '22222222-2222-4222-8222-222222222222', reservationId: '11111111-1111-4111-8111-111111111111',
    scenario: 'success', status: 'PENDING', createdAt: '2027-01-01T00:00:00.000Z' };
  const store: PaymentAttemptStore & PaymentAttemptReader = {
    async create(_id, reservationId, scenario) { effects.push('create'); Object.assign(row, { reservationId, scenario }); return { ...row }; },
    async changeStatus(_id, status) { effects.push(status); row.status = status; return { ...row }; },
    async listForReservation(id: string) { return id === row.reservationId ? [{ ...row, secret: 'internal' }] : []; },
  };
  const handler = new ProcessPaymentHandler(store, { async run() { effects.push('simulate'); return result; } }, { next: () => row.id });
  return { effects, row, store, handler };
}

for (const [scenario, result] of [['success', 'SUCCEEDED'], ['failure', 'FAILED'], ['slow', 'PENDING']] as const) {
  test(`Paiement ${scenario} possède le cycle de la tentative`, async () => {
    const f = fixture(result);
    const attempt = await f.handler.execute({ reservationId: f.row.reservationId, scenario });
    assert.equal(attempt.status, result);
    assert.equal(attempt.reservationId, f.row.reservationId);
    assert.deepEqual(f.effects, result === 'PENDING' ? ['create', 'simulate'] : ['create', 'simulate', result]);
  });
}

for (const command of [{ reservationId: 'bad', scenario: 'success' }, { reservationId: '11111111-1111-4111-8111-111111111111', scenario: 'bad' }]) {
  test(`Paiement refuse une demande invalide sans effet : ${JSON.stringify(command)}`, async () => {
    const f = fixture();
    await assert.rejects(f.handler.execute(command), { code: 'INVALID_INPUT' });
    assert.deepEqual(f.effects, []);
  });
}

test('la lecture Paiement ne publie que les champs du contrat', async () => {
  const f = fixture();
  const attempts = await new ListPaymentAttemptsHandler(f.store).execute({ reservationId: f.row.reservationId });
  assert.deepEqual(Object.keys(attempts[0]).sort(), ['createdAt', 'id', 'reservationId', 'scenario', 'status']);
  assert.deepEqual(f.effects, []);
});

test('une panne du simulateur conserve une tentative PENDING et remonte sans retry', async () => {
  const f = fixture();
  const handler = new ProcessPaymentHandler(f.store, { async run() { throw new Error('coupure'); } }, { next: () => f.row.id });
  await assert.rejects(handler.execute({ reservationId: f.row.reservationId, scenario: 'success' }), /coupure/);
  assert.equal(f.row.status, 'PENDING');
  assert.deepEqual(f.effects, ['create']);
});
