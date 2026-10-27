import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildHttpApp } from '../src/adapters/http/buildHttpApp.js';
import type { UseCases } from '../src/application/UseCases.js';
import { BusinessError, type BusinessErrorCode } from '../src/domain/BusinessError.js';

function useCasesWithFailure(error: Error): UseCases {
  const failing = { async execute(): Promise<never> { throw error; } };
  return { checkout: failing, me: failing, getEvent: failing, getReservation: failing,
    listEvents: failing, login: failing, logout: failing, reserve: failing, expirePendingReservations: failing };
}

for (const [code, status] of [
  ['INVALID_INPUT', 400], ['AUTH_REQUIRED', 401], ['INVALID_CREDENTIALS', 401],
  ['EVENT_NOT_FOUND', 404], ['EVENT_CANCELLED', 409], ['SOLD_OUT', 409],
  ['RESERVATION_NOT_FOUND', 404], ['RESERVATION_FORBIDDEN', 403],
  ['RESERVATION_EXPIRED', 410], ['RESERVATION_CLOSED', 409],
] satisfies Array<[BusinessErrorCode, number]>) {
  test(`la périphérie traduit ${code} en HTTP ${status}`, async () => {
    const app = buildHttpApp(useCasesWithFailure(new BusinessError(code, 'Refus métier.')),
      { secureCookies: false, sessionTtlMs: 1_800_000 }, async () => {});
    try {
      const response = await app.inject('/api/events');
      assert.equal(response.statusCode, status);
      assert.deepEqual(response.json(), { error: { code, message: 'Refus métier.' } });
    } finally { await app.close(); }
  });
}

test('une défaillance technique reste une erreur HTTP 503 sans détail interne', async () => {
  const app = buildHttpApp(useCasesWithFailure(new Error('détail interne')),
    { secureCookies: false, sessionTtlMs: 1_800_000 }, async () => {});
  try {
    const response = await app.inject('/api/events');
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), { error: { code: 'TECHNICAL_FAILURE', message: 'Service momentanément indisponible.' } });
  } finally { await app.close(); }
});
