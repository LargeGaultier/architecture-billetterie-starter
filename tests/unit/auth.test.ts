import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LoginUserHandler } from '../../src/application/commands/LoginUser.js';
import { GetCurrentUserHandler } from '../../src/application/queries/GetCurrentUser.js';
import { LogoutUserHandler } from '../../src/application/commands/LogoutUser.js';
import type { Session } from '../../src/domain/models/Session.js';
import type { UserAccount } from '../../src/domain/models/UserAccount.js';
import type { PasswordVerifier } from '../../src/application/ports/PasswordVerifier.js';
import type { SessionStore } from '../../src/application/ports/SessionStore.js';
import type { UserStore } from '../../src/application/ports/UserStore.js';
import type { UserReader } from '../../src/application/ports/UserReader.js';
import type { SessionReader } from '../../src/application/ports/SessionReader.js';

function fixture() {
  let now = 1_000;
  let sequence = 0;
  const users = new Map<string, UserAccount>([['alice', { id: 'alice', login: 'alice', passwordHash: 'stored-alice-hash' }]]);
  const sessions = new Map<string, Session>();
  const effects: string[] = [];
  const checked: Array<[string, string | null]> = [];
  const userStore: UserStore & UserReader = {
    async findByLogin(login) { return users.get(login) ?? null; },
    async findById(id) { const user = users.get(id); return user ? { id: user.id, login: user.login } : null; },
  };
  const sessionStore: SessionStore & SessionReader = {
    async save(session) { effects.push('session:save'); sessions.set(session.id, { ...session }); },
    async find(id) { const session = sessions.get(id); return session ? { ...session } : null; },
    async revoke(id) { if (id) { effects.push('session:revoke'); sessions.delete(id); } },
    async removeExpired(at) {
      effects.push('session:cleanup');
      for (const [id, session] of sessions) if (session.expiresAt <= at) sessions.delete(id);
    },
  };
  const passwords: PasswordVerifier = {
    async verify(password, hash) { checked.push([password, hash]); return password === 'correct' && hash === 'stored-alice-hash'; },
  };
  const clock = { now: () => now };
  const ids = { next: () => `opaque-token-${++sequence}` };
  return { users, sessions, effects, checked, sessionStore,
    login: new LoginUserHandler(userStore, passwords, sessionStore, ids, clock, 1_800_000),
    me: new GetCurrentUserHandler(sessionStore, userStore, clock), logout: new LogoutUserHandler(sessionStore),
    setNow: (value: number) => { now = value; } };
}

test('connexion correcte : compte public, hash vérifié et session expirant dans 30 minutes', async () => {
  const f = fixture();
  const result = await f.login.execute({ login: ' alice ', password: 'correct' });
  assert.deepEqual(result, { user: { id: 'alice', login: 'alice' }, sessionId: 'opaque-token-1' });
  assert.deepEqual(f.checked, [['correct', 'stored-alice-hash']]);
  assert.deepEqual(f.sessions.get(result.sessionId), { id: 'opaque-token-1', userId: 'alice', expiresAt: 1_801_000 });
  assert.deepEqual(f.effects, ['session:cleanup', 'session:save']);
});

for (const [login, password] of [['alice', 'incorrect'], ['inconnu', 'correct'], ['', ''], [[], {}], ['alice', 'x'.repeat(1025)]]) {
  test(`connexion refusée (${String(login) || 'vide'}) sans création ni révocation de session`, async () => {
    const f = fixture();
    f.sessions.set('old', { id: 'old', userId: 'alice', expiresAt: 2000 });
    await assert.rejects(f.login.execute({ login: login, password: password, previousSessionId: 'old' }), { code: 'INVALID_CREDENTIALS' });
    assert.deepEqual(f.effects, []);
    assert.equal(f.sessions.size, 1);
  });
}

test('un compte inconnu est aussi passé au vérificateur sans hash technique dans le cas d’usage', async () => {
  const f = fixture();
  await assert.rejects(f.login.execute({ login: 'inconnu', password: 'correct' }), { code: 'INVALID_CREDENTIALS' });
  assert.deepEqual(f.checked, [['correct', null]]);
});

test('une connexion réussie remplace l’ancienne session et purge les expirées', async () => {
  const f = fixture();
  f.sessions.set('old', { id: 'old', userId: 'alice', expiresAt: 3000 });
  f.sessions.set('expired', { id: 'expired', userId: 'bob', expiresAt: 1000 });
  const result = await f.login.execute({ login: 'alice', password: 'correct', previousSessionId: 'old' });
  assert.equal(f.sessions.has('old'), false);
  assert.equal(f.sessions.has('expired'), false);
  assert.equal(f.sessions.has(result.sessionId), true);
  assert.deepEqual(f.effects, ['session:cleanup', 'session:save', 'session:revoke']);
});

test('utilisateur courant : session valide inchangée puis refus au seuil exact', async () => {
  const f = fixture();
  f.sessions.set('valid', { id: 'valid', userId: 'alice', expiresAt: 2000 });
  f.setNow(1999);
  assert.deepEqual(await f.me.execute({ sessionId: 'valid' }), { id: 'alice', login: 'alice' });
  assert.equal(f.sessions.get('valid')!.expiresAt, 2000);
  f.setNow(2000);
  await assert.rejects(f.me.execute({ sessionId: 'valid' }), { code: 'AUTH_REQUIRED' });
  assert.deepEqual(f.effects, []);
  assert.equal(f.sessions.has('valid'), true);
});

for (const sessionId of [undefined, 'forged', 'alice']) {
  test(`session ${sessionId ?? 'absente'} refusée sans effet`, async () => {
    const f = fixture();
    await assert.rejects(f.me.execute({ sessionId: sessionId }), { code: 'AUTH_REQUIRED' });
    assert.deepEqual(f.effects, []);
  });
}

test('un compte supprimé ne peut plus être retrouvé par sa session', async () => {
  const f = fixture();
  f.sessions.set('valid', { id: 'valid', userId: 'alice', expiresAt: 2000 });
  f.users.clear();
  await assert.rejects(f.me.execute({ sessionId: 'valid' }), { code: 'AUTH_REQUIRED' });
  assert.deepEqual(f.effects, []);
});

test('déconnexion : ancien token révoqué, autre session conservée et absence de cookie acceptée', async () => {
  const f = fixture();
  f.sessions.set('alice-token', { id: 'alice-token', userId: 'alice', expiresAt: 2000 });
  f.sessions.set('other-token', { id: 'other-token', userId: 'alice', expiresAt: 2000 });
  await f.logout.execute({ sessionId: 'alice-token' });
  await assert.rejects(f.me.execute({ sessionId: 'alice-token' }), { code: 'AUTH_REQUIRED' });
  assert.deepEqual(await f.me.execute({ sessionId: 'other-token' }), { id: 'alice', login: 'alice' });
  await f.logout.execute({ sessionId: undefined });
  assert.deepEqual(f.effects, ['session:revoke']);
});
