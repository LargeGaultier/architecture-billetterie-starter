import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ListEventsHandler } from '../../application/queries/ListEvents.js';
import { ticketingFixture } from './ticketing-fixture.js';

test('la requête catalogue laisse les réservations expirables intactes', async () => {
  const f = ticketingFixture();
  f.setNow(Date.parse(f.reservation.expiresAt));
  const before = structuredClone([...f.reservationRows.values()]);
  const result = await new ListEventsHandler(f.events).execute({});
  assert.equal(result.length, 1);
  assert.deepEqual([...f.reservationRows.values()], before);
  assert.deepEqual(f.effects, []);
});

test('le catalogue projette des DTO sans détail technique ni référence vers le stockage', async () => {
  const f = ticketingFixture();
  const data = { ...f.event, internalNote: 'secret', save: () => assert.fail('écriture interdite') };
  const rows = [data];
  const result = await new ListEventsHandler({ ...f.events, async list() { return rows; } }).execute({});
  assert.deepEqual(Object.keys(result[0]).sort(), ['available', 'capacity', 'id', 'startsAt', 'status', 'title', 'venue']);
  assert.notEqual(result, rows);
  assert.notEqual(result[0], data);
});
