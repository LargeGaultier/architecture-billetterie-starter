import type { IdentityApi } from '../../src/modules/identity/index.js';
import type { TicketingApi } from '../../src/modules/ticketing/index.js';
export interface Application { identity: IdentityApi; ticketing: TicketingApi }
