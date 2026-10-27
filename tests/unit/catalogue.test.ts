import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ListEvents } from '../../src/application/ListEvents.js';
import { GetEventHandler } from '../../src/application/queries/GetEvent.js';
import { ticketingFixture } from './ticketing-fixture.js';

test('le catalogue est public et conserve le déclenchement d’expiration avant lecture', async () => {
  const f = ticketingFixture();
  f.setNow(Date.parse(f.reservation.expiresAt));
  const catalogue = new ListEvents({
    async list() {
      assert.equal(f.reservation.status, 'EXPIRED');
      return f.events.list();
    },
  }, f.reservations);
  assert.deepEqual(await catalogue.execute(), [f.event]);
  assert.deepEqual(f.effects, ['expire']);
});

test('la requête de détail public retourne le DTO sans expirer les réservations', async () => {
  const f = ticketingFixture();
  f.setNow(Date.parse(f.reservation.expiresAt));
  const detail = new GetEventHandler({
    ...f.events,
    async find(id) {
      assert.equal(f.reservation.status, 'PENDING');
      return f.events.find(id);
    },
  });
  assert.deepEqual(await detail.execute({ eventId: 'concert' }), f.event);
  assert.deepEqual(f.effects, []);
});

test('un événement public absent conserve EVENT_NOT_FOUND sans expiration', async () => {
  const f = ticketingFixture();
  const detail = new GetEventHandler(f.events);
  await assert.rejects(detail.execute({ eventId: 'absent' }), { code: 'EVENT_NOT_FOUND' });
  assert.deepEqual(f.effects, []);
});

test('un catalogue vide reste consultable sans compte', async () => {
  const f = ticketingFixture();
  f.eventRows.clear();
  assert.deepEqual(await new ListEvents(f.events, f.reservations).execute(), []);
});
