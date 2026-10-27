import type { IdentityConfig } from '../modules/identity/index.js';
export type { TicketingConfig } from '../modules/ticketing/index.js';

export interface AuthConfig extends IdentityConfig {
  secureCookies?: boolean;
}
