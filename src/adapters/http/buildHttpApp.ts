import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import type { Application } from '../../contracts/Application.js';
import { registerIdentityRoutes } from '../../modules/identity/index.js';
import { registerTicketingRoutes, type CurrentActor } from '../../modules/ticketing/index.js';
import { BusinessError } from '../../shared/domain/BusinessError.js';
import { businessErrorStatus } from '../../shared/adapters/http/businessErrors.js';

export function buildHttpApp(application: Application, options: { secureCookies: boolean; sessionTtlMs: number }, healthcheck: () => Promise<void>) {
  const app = Fastify({ logger: true });
  app.register(cookie);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof BusinessError) {
      return reply.code(businessErrorStatus[error.code]).send({ error: { code: error.code, message: error.message } });
    }
    app.log.error(error);
    return reply.code(503).send({ error: { code: 'TECHNICAL_FAILURE', message: 'Service momentanément indisponible.' } });
  });
  app.get('/health', async (_request, reply) => {
    await healthcheck();
    return reply.send({ status: 'ok' });
  });
  // Adaptation entre les contrats publics : aucune classe interne Identité
  // ni donnée de session n'entre dans le module Billetterie.
  const actors: CurrentActor = {
    resolve: async sessionId => {
      const user = await application.identity.queries.getCurrentUser.execute({ sessionId });
      return { id: user.id };
    },
  };
  registerIdentityRoutes(app, application.identity, options);
  registerTicketingRoutes(app, application.ticketing, actors);
  for (const [route, file, type] of [
    ['/', 'index.html', 'text/html; charset=utf-8'],
    ['/app.css', 'app.css', 'text/css; charset=utf-8'],
    ['/app.js', 'app.js', 'text/javascript; charset=utf-8'],
  ]) {
    app.get(route, async (_request, reply) => {
      const body = await readFile(join(process.cwd(), 'public', file));
      return reply.type(type).send(body);
    });
  }
  return app;
}
