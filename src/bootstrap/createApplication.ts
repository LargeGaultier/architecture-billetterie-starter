import type { Pool } from 'pg';
import type { Application } from '../contracts/Application.js';
import { createIdentityModule } from '../modules/identity/index.js';
import { createTicketingModule } from '../modules/ticketing/index.js';
import type { AuthConfig, TicketingConfig } from './config.js';

export function createApplication(pool: Pool, config: TicketingConfig, authConfig: AuthConfig = {}): Application {
  return {
    identity: createIdentityModule(pool, authConfig),
    ticketing: createTicketingModule(pool, config),
  };
}
