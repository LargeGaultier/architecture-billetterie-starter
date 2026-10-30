import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { analyzeProject } from '../scripts/check-architecture.mjs';

function analyzeFixture(files: Record<string, string>) {
  const base = resolve(tmpdir());
  const root = mkdtempSync(resolve(base, 'tp6-boundaries-'));
  try {
    mkdirSync(resolve(root, 'src/modules/identity'), { recursive: true });
    mkdirSync(resolve(root, 'src/modules/ticketing'), { recursive: true });
    mkdirSync(resolve(root, 'src/modules/payments'), { recursive: true });
    for (const [path, source] of Object.entries(files)) {
      const target = resolve(root, path);
      assert.ok(target.startsWith(root + sep));
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, source);
    }
    return analyzeProject(root);
  } finally {
    assert.ok(root.startsWith(base + sep) && dirname(root) === base && root.includes('tp6-boundaries-'));
    rmSync(root, { recursive: true, force: true });
  }
}

test('les dependances internes vers un domaine et un port de lecture sont autorisees', () => {
  const result = analyzeFixture({
    'src/modules/ticketing/domain/Rule.ts': 'export const allowed = true;',
    'src/modules/ticketing/application/ports/EventReader.ts': 'export interface EventReader {}',
    'src/modules/ticketing/application/queries/GetEvent.ts': "import { allowed } from '../../domain/Rule.js'; import type { EventReader } from '../ports/EventReader.js';",
  });
  assert.deepEqual(result.violations, []);
});

test('un module ne peut importer le repository prive d un autre module', () => {
  const result = analyzeFixture({
    'src/modules/identity/adapters/postgres/UserRepository.ts': 'export class UserRepository {}',
    'src/modules/ticketing/adapters/Bad.ts': "import { UserRepository } from '../../identity/adapters/postgres/UserRepository.js';",
  });
  assert.ok(result.violations.some((value: string) => value.includes('[PRIVATE_IMPORT]')));
});

test('une application ne peut importer son adaptateur SQL', () => {
  const result = analyzeFixture({
    'src/modules/ticketing/adapters/Store.ts': 'export class Store {}',
    'src/modules/ticketing/application/commands/Bad.ts': "import { Store } from '../../adapters/Store.js';",
  });
  assert.ok(result.violations.some((value: string) => value.includes('[CLEAN]')));
});

test('une requete ne peut importer un port d ecriture', () => {
  const result = analyzeFixture({
    'src/modules/ticketing/application/ports/ReservationStore.ts': 'export interface ReservationStore {}',
    'src/modules/ticketing/application/queries/Bad.ts': "import type { ReservationStore } from '../ports/ReservationStore.js';",
  });
  assert.ok(result.violations.some((value: string) => value.includes('[CQRS_READ]')));
});

test('le partage technique ne peut dependre d un module metier', () => {
  const result = analyzeFixture({
    'src/modules/identity/index.ts': 'export interface IdentityApi {}',
    'src/shared/application/Bad.ts': "import type { IdentityApi } from '../../modules/identity/index.js';",
  });
  assert.ok(result.violations.some((value: string) => value.includes('[SHARED]')));
});

test('un cycle entre API publiques de modules est refuse', () => {
  const result = analyzeFixture({
    'src/modules/identity/index.ts': 'export interface IdentityApi {}',
    'src/modules/ticketing/index.ts': 'export interface TicketingApi {}',
    'src/modules/identity/adapters/Bridge.ts': "import type { TicketingApi } from '../../ticketing/index.js';",
    'src/modules/ticketing/adapters/Bridge.ts': "import type { IdentityApi } from '../../identity/index.js';",
  });
  assert.ok(result.violations.some((value: string) => value.includes('[CYCLE]')));
});

test('la billetterie ne peut lire directement la table users', () => {
  const result = analyzeFixture({
    'src/modules/ticketing/adapters/postgres/Bad.ts': "const sql = 'SELECT id FROM users';",
  });
  assert.ok(result.violations.some((value: string) => value.includes('[DATA_OWNER]')));
});

test('les requetes SQL sur les tables propres au module restent autorisees', () => {
  const result = analyzeFixture({
    'src/modules/identity/adapters/postgres/Users.ts': "const sql = 'SELECT id FROM users';",
    'src/modules/ticketing/adapters/postgres/Events.ts': 'const sql = `SELECT * FROM events e JOIN reservations r ON r.event_id=e.id`;',
    'src/modules/payments/adapters/postgres/Attempts.ts': "const sql = 'SELECT * FROM payment_attempts';",
  });
  assert.deepEqual(result.violations, []);
});

test('un service ne peut importer directement même l API publique d un autre service', () => {
  const result = analyzeFixture({
    'src/modules/identity/index.ts': 'export interface IdentityApi {}',
    'src/modules/ticketing/adapters/Bad.ts': "import type { IdentityApi } from '../../identity/index.js';",
  });
  assert.ok(result.violations.some((value: string) => value.includes('[SERVICE_IMPORT]')));
});

test('la billetterie ne peut accéder directement aux tentatives Paiement', () => {
  const result = analyzeFixture({ 'src/modules/ticketing/adapters/postgres/Bad.ts': "const sql = 'SELECT * FROM payment_attempts';" });
  assert.ok(result.violations.some((value: string) => value.includes('[DATA_OWNER]')));
});

test('la gateway ne peut importer pg ni assembler un module métier', () => {
  const result = analyzeFixture({
    'src/modules/identity/index.ts': 'export const identity = true;',
    'src/adapters/http/buildGatewayApp.ts': "import { Pool } from 'pg'; import { identity } from '../../modules/identity/index.js';",
  });
  assert.ok(result.violations.some((value: string) => value.includes('[GATEWAY_DB]')));
  assert.ok(result.violations.some((value: string) => value.includes('[GATEWAY_MODULE]')));
});

test('le processus Identité ne peut assembler le module Billetterie', () => {
  const result = analyzeFixture({
    'src/modules/ticketing/index.ts': 'export const ticketing = true;',
    'src/services/identity.ts': "import { ticketing } from '../modules/ticketing/index.js';",
  });
  assert.ok(result.violations.some((value: string) => value.includes('[SERVICE_BOOTSTRAP]')));
});
