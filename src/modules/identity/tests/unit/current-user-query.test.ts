import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GetCurrentUserHandler } from '../../application/queries/GetCurrentUser.js';

test('la requête utilisateur retourne seulement son DTO public sans secret ni méthode', async () => {
  const account = { id: 'alice', login: 'alice', passwordHash: 'secret', sessionId: 'opaque',
    save: () => assert.fail('écriture interdite') };
  const session = { id: 'opaque', userId: 'alice', expiresAt: 2000 };
  const query = new GetCurrentUserHandler({ async find() { return session; } },
    { async findById() { return account; } }, { now: () => 1000 });
  const result = await query.execute({ sessionId: 'opaque' });
  assert.deepEqual(result, { id: 'alice', login: 'alice' });
  assert.notEqual(result, account);
});

test('la requête de session expirée ne supprime ni ne prolonge la session', async () => {
  const session = Object.freeze({ id: 'opaque', userId: 'alice', expiresAt: 1000 });
  const before = { ...session };
  const query = new GetCurrentUserHandler({ async find() { return session; } },
    { async findById() { assert.fail('Un compte expiré ne doit pas être chargé.'); } }, { now: () => 1000 });
  await assert.rejects(query.execute({ sessionId: 'opaque' }), { code: 'AUTH_REQUIRED' });
  assert.deepEqual(session, before);
});
