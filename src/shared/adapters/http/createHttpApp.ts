import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { BusinessError } from '../../domain/BusinessError.js';
import { businessErrorStatus } from './businessErrors.js';

export function createHttpApp(healthcheck: () => Promise<void>) {
  const app = Fastify({ logger: process.env.HTTP_LOG === 'true' });
  app.register(cookie);
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof BusinessError) {
      return reply.code(businessErrorStatus[error.code]).send({ error: { code: error.code, message: error.message } });
    }
    app.log.error(error);
    return reply.code(503).send({ error: { code: 'TECHNICAL_FAILURE', message: 'Service momentanément indisponible.' } });
  });
  app.get('/health', async () => { await healthcheck(); return { status: 'ok' }; });
  return app;
}
