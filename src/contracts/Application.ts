import type { IdentityApi } from '../modules/identity/index.js';
import type { TicketingApi } from '../modules/ticketing/index.js';

/** Composition du processus : seules les API publiques des capacités sont visibles. */
export interface Application {
  identity: IdentityApi;
  ticketing: TicketingApi;
}
