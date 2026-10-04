import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Fastify from 'fastify';
import type { Pool } from 'pg';
import { AppError } from './errors.js';
import { PaymentSimulator } from './integrations/PaymentSimulator.js';
import { EventRepository } from './repositories/EventRepository.js';
import { PaymentAttemptRepository } from './repositories/PaymentAttemptRepository.js';
import { ReservationRepository } from './repositories/ReservationRepository.js';
import { TicketingService, type TicketingConfig } from './services/TicketingService.js';
import type { PaymentScenario } from './types.js';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function buildApp(pool: Pool, config: TicketingConfig) {
  const app = Fastify({ logger: true });
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
  app.get<{ Params: { id: string } }>('/api/events/:id', async request => ({ event: await service.getEvent(request.params.id) }));
  app.post('/api/reservations', async (request, reply) => {
    const body = asRecord(request.body);
    const eventId = typeof body.eventId === 'string' ? body.eventId : '';
    const customerRef = typeof body.customerRef === 'string' ? body.customerRef : '';
    return reply.code(201).send({ reservation: await service.reserve(eventId, customerRef) });
  });
  app.get<{ Params: { id: string } }>('/api/reservations/:id', async request => ({ reservation: await service.getReservation(request.params.id) }));
  app.post<{ Params: { id: string } }>('/api/reservations/:id/checkout', async request => {
    const body = asRecord(request.body);
    const scenario = typeof body.scenario === 'string' ? body.scenario as PaymentScenario : 'success';
    return service.checkout(request.params.id, scenario);
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
