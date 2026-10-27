import type { Pool } from 'pg';
import type { IdentityApi } from '../contracts/IdentityApi.js';
import type { IdentityConfig } from '../contracts/IdentityConfig.js';
import { LoginUserHandler } from '../application/commands/LoginUser.js';
import { LogoutUserHandler } from '../application/commands/LogoutUser.js';
import { GetCurrentUserHandler } from '../application/queries/GetCurrentUser.js';
import { UserRepository } from '../adapters/postgres/UserRepository.js';
import { MemorySessionStore } from '../adapters/auth/MemorySessionStore.js';
import { ScryptPasswordVerifier } from '../adapters/auth/ScryptPasswordVerifier.js';
import { sessionIds } from '../adapters/system/runtime.js';
import { systemClock } from '../../../shared/adapters/system/clock.js';

export function createIdentityModule(pool: Pool, config: IdentityConfig = {}): IdentityApi {
  const users = new UserRepository(pool);
  const sessions = new MemorySessionStore();
  const clock = { now: config.now ?? systemClock.now };
  return {
    commands: {
      loginUser: new LoginUserHandler(users, new ScryptPasswordVerifier(), sessions, sessionIds, clock, config.sessionTtlMs ?? 30 * 60_000),
      logoutUser: new LogoutUserHandler(sessions),
    },
    queries: { getCurrentUser: new GetCurrentUserHandler(sessions, users, clock) },
  };
}
