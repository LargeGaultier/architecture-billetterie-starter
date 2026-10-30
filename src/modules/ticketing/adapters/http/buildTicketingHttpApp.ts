import type { TicketingApi } from '../../contracts/TicketingApi.js';
import type { CurrentActor } from '../../contracts/CurrentActor.js';
import { createHttpApp } from '../../../../shared/adapters/http/createHttpApp.js';
import { registerTicketingRoutes } from './registerTicketingRoutes.js';
export function buildTicketingHttpApp(ticketing: TicketingApi, actors: CurrentActor, healthcheck: () => Promise<void>) {
  const app = createHttpApp(healthcheck);
  registerTicketingRoutes(app, ticketing, actors);
  return app;
}
