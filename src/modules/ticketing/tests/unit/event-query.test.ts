import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GetEventHandler } from '../../application/queries/GetEvent.js';
import { ReservePlaceHandler } from '../../application/commands/ReservePlace.js';
import { ticketingFixture } from './ticketing-fixture.js';

test('la requête événement ne déclenche aucune expiration ni écriture', async () => {
  const f = ticketingFixture();
  f.setNow(Date.parse(f.reservation.expiresAt));
  const before = structuredClone([...f.reservationRows.values()]);
  const result = await new GetEventHandler(f.events).execute({ eventId: 'concert' });
  assert.equal(result.id, 'concert');
  assert.deepEqual(f.effects, []);
  assert.deepEqual([...f.reservationRows.values()], before);
});

test('la requête événement retourne seulement le DTO public et une copie des données', async () => {
  const f = ticketingFixture();
  const data = { ...f.event, internalNote: 'interne', save: () => assert.fail('écriture interdite') };
  const result = await new GetEventHandler({ ...f.events, async find() { return data; } }).execute({ eventId: 'concert' });
  assert.deepEqual(Object.keys(result).sort(), ['available', 'capacity', 'id', 'startsAt', 'status', 'title', 'venue']);
  assert.notEqual(result, data);
});

test('une commande revalide l’événement annulé après la consultation', async () => {
  const f = ticketingFixture();
  const detail = new GetEventHandler(f.events);
  const reserve = new ReservePlaceHandler(f.events, f.reservations, f.expiration, f.ids, f.clock, f.pause, { reservationTtlMinutes: 15, reservationHoldMs: 0 });
  const shown = await detail.execute({ eventId: 'concert' });
  assert.equal(shown.status, 'OPEN');
  assert.equal(shown.available, 1);
  f.event.status = 'CANCELLED';
  f.effects.length = 0;
  await assert.rejects(reserve.execute({ eventId: 'concert', actorId: 'alice' }), { code: 'EVENT_CANCELLED' });
  assert.equal(shown.status, 'OPEN');
  assert.equal(f.reservationRows.size, 1);
  assert.deepEqual(f.effects, ['expire']);
});
