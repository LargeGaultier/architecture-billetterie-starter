import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ListEvents } from '../../src/application/ListEvents.js';
import { GetEvent } from '../../src/application/GetEvent.js';
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

test('le détail public retourne l’événement et expire les réservations comme au TP 3', async () => {
  const f = ticketingFixture();
  f.setNow(Date.parse(f.reservation.expiresAt));
  const detail = new GetEvent({
    async find(id) {
      assert.equal(f.reservation.status, 'EXPIRED');
      return f.events.find(id);
    },
  }, f.reservations);
  assert.deepEqual(await detail.execute('concert'), f.event);
  assert.deepEqual(f.effects, ['expire']);
});

test('un événement public absent conserve EVENT_NOT_FOUND après expiration', async () => {
  const f = ticketingFixture();
  const detail = new GetEvent(f.events, f.reservations);
  await assert.rejects(detail.execute('absent'), { code: 'EVENT_NOT_FOUND' });
  assert.deepEqual(f.effects, ['expire']);
});

test('un catalogue vide reste consultable sans compte', async () => {
  const f = ticketingFixture();
  f.eventRows.clear();
  assert.deepEqual(await new ListEvents(f.events, f.reservations).execute(), []);
});
