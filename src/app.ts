import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import type { Pool } from 'pg';
import { AppError } from './errors.js';
import { PaymentSimulator } from './integrations/PaymentSimulator.js';
import { EventRepository } from './repositories/EventRepository.js';
import { PaymentAttemptRepository } from './repositories/PaymentAttemptRepository.js';
import { ReservationRepository } from './repositories/ReservationRepository.js';
import { TicketingService, type TicketingConfig } from './services/TicketingService.js';
import type { PaymentScenario } from './types.js';
import { UserRepository } from './repositories/UserRepository.js';
import { AuthService } from './services/AuthService.js';
import { SessionService, type AuthConfig } from './services/SessionService.js';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function buildApp(pool: Pool, config: TicketingConfig, authConfig: AuthConfig = {}) {
  const app = Fastify({ logger: true });
  app.register(cookie);
  const sessions = new SessionService(authConfig);
  const auth = new AuthService(new UserRepository(pool), sessions);
  const cookieName = 'ticketing_session';
  const cookieOptions = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: authConfig.secureCookies ?? false };
  const service = new TicketingService(
    new EventRepository(pool),
    new ReservationRepository(pool),
    new PaymentAttemptRepository(pool),
    new PaymentSimulator(config.paymentSlowMs),
    config,
  );

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
    }
    app.log.error(error);
    return reply.code(503).send({ error: { code: 'TECHNICAL_FAILURE', message: 'Service momentanément indisponible.' } });
  });

  app.get('/health', async (_request, reply) => {
    await pool.query('SELECT 1');
    return reply.send({ status: 'ok' });
  });
  app.get('/api/events', async () => ({ events: await service.listEvents() }));
  app.post('/api/auth/login', async (request, reply) => {
    const body = asRecord(request.body);
    const result = await auth.login(body.login, body.password);
    auth.logout(request.cookies[cookieName]);
    reply.setCookie(cookieName, result.sessionId, { ...cookieOptions, maxAge: Math.floor(sessions.ttlMs / 1000) });
    return { user: result.user };
  });
  app.get('/api/auth/me', async request => ({ user: await auth.currentUser(request.cookies[cookieName]) }));
  app.post('/api/auth/logout', async (request, reply) => {
    auth.logout(request.cookies[cookieName]);
    return reply.clearCookie(cookieName, cookieOptions).code(204).send();
  });
  app.get<{ Params: { id: string } }>('/api/events/:id', async request => ({ event: await service.getEvent(request.params.id) }));
  app.post('/api/reservations', async (request, reply) => {
    const user = await auth.currentUser(request.cookies[cookieName]);
    const body = asRecord(request.body);
    const eventId = typeof body.eventId === 'string' ? body.eventId : '';
    return reply.code(201).send({ reservation: await service.reserve(eventId, user.id) });
  });
  app.get<{ Params: { id: string } }>('/api/reservations/:id', async request => {
    const user = await auth.currentUser(request.cookies[cookieName]);
    return { reservation: await service.getReservation(request.params.id, user.id) };
  });
  app.post<{ Params: { id: string } }>('/api/reservations/:id/checkout', async request => {
    const user = await auth.currentUser(request.cookies[cookieName]);
    const body = asRecord(request.body);
    const scenario = typeof body.scenario === 'string' ? body.scenario as PaymentScenario : 'success';
    return service.checkout(request.params.id, scenario, user.id);
  });

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
