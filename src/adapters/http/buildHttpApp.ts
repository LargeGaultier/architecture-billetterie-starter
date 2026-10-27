import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import type { Application } from '../../application/Application.js';
import { BusinessError } from '../../domain/BusinessError.js';
import { businessErrorStatus } from './businessErrors.js';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function buildHttpApp(application: Application, options: { secureCookies: boolean; sessionTtlMs: number }, healthcheck: () => Promise<void>) {
  const app = Fastify({ logger: true });
  app.register(cookie);
  const cookieName = 'ticketing_session';
  const cookieOptions = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: options.secureCookies };

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
  app.get('/api/events', async () => {
    await application.commands.expirePendingReservations.execute({});
    return { events: await application.queries.listEvents.execute({}) };
  });
  app.get<{ Params: { id: string } }>('/api/events/:id', async request => {
    await application.commands.expirePendingReservations.execute({});
    return { event: await application.queries.getEvent.execute({ eventId: request.params.id }) };
  });
  app.post('/api/auth/login', async (request, reply) => {
    const body = asRecord(request.body);
    const result = await application.commands.loginUser.execute({ login: body.login, password: body.password, previousSessionId: request.cookies[cookieName] });
    reply.setCookie(cookieName, result.sessionId, { ...cookieOptions, maxAge: Math.floor(options.sessionTtlMs / 1000) });
    return { user: result.user };
  });
  app.get('/api/auth/me', async request => ({ user: await application.queries.getCurrentUser.execute({ sessionId: request.cookies[cookieName] }) }));
  app.post('/api/auth/logout', async (request, reply) => {
    await application.commands.logoutUser.execute({ sessionId: request.cookies[cookieName] });
    return reply.clearCookie(cookieName, cookieOptions).code(204).send();
  });
  app.post('/api/reservations', async (request, reply) => {
    const user = await application.queries.getCurrentUser.execute({ sessionId: request.cookies[cookieName] });
    const body = asRecord(request.body);
    const eventId = typeof body.eventId === 'string' ? body.eventId : '';
    return reply.code(201).send({ reservation: await application.commands.reservePlace.execute({ eventId, actorId: user.id }) });
  });
  app.get<{ Params: { id: string } }>('/api/reservations/:id', async request => {
    const user = await application.queries.getCurrentUser.execute({ sessionId: request.cookies[cookieName] });
    const query = { reservationId: request.params.id, actorId: user.id };
    // La première lecture autorise l'accès avant toute maintenance. Un refus
    // étranger ne doit pas modifier une réservation, même arrivée à expiration.
    await application.queries.getMyReservation.execute(query);
    await application.commands.expirePendingReservations.execute({});
    return { reservation: await application.queries.getMyReservation.execute(query) };
  });
  app.post<{ Params: { id: string } }>('/api/reservations/:id/checkout', async request => {
    const user = await application.queries.getCurrentUser.execute({ sessionId: request.cookies[cookieName] });
    const body = asRecord(request.body);
    const scenario = typeof body.scenario === 'string' ? body.scenario : 'success';
    return application.commands.checkoutReservation.execute({ reservationId: request.params.id, actorId: user.id, scenario });
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
