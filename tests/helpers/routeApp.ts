import type { Application } from './Application.js';
import { createHttpApp } from '../../src/shared/adapters/http/createHttpApp.js';
import { registerIdentityRoutes } from '../../src/modules/identity/index.js';
import { registerTicketingRoutes } from '../../src/modules/ticketing/index.js';
export function buildHttpApp(application: Application, options: { secureCookies: boolean; sessionTtlMs: number }, healthcheck: () => Promise<void>) {
  const app = createHttpApp(healthcheck);
  registerIdentityRoutes(app, application.identity, options);
  registerTicketingRoutes(app, application.ticketing, { async resolve(sessionId) {
    const user = await application.identity.queries.getCurrentUser.execute({ sessionId });
    return { id: user.id };
  } });
  return app;
}
