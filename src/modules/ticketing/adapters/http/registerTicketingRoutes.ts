import type { FastifyInstance } from 'fastify';
import type { CurrentActor } from '../../contracts/CurrentActor.js';
import type { TicketingApi } from '../../contracts/TicketingApi.js';
import { asRecord } from '../../../../shared/adapters/http/asRecord.js';
import { sessionCookieName } from '../../../../shared/adapters/http/sessionCookie.js';

export function registerTicketingRoutes(app: FastifyInstance, ticketing: TicketingApi, actors: CurrentActor): void {
  app.get('/api/events', async () => {
    await ticketing.commands.expirePendingReservations.execute({});
    return { events: await ticketing.queries.listEvents.execute({}) };
  });
  app.get<{ Params: { id: string } }>('/api/events/:id', async request => {
    await ticketing.commands.expirePendingReservations.execute({});
    return { event: await ticketing.queries.getEvent.execute({ eventId: request.params.id }) };
  });
  app.post('/api/reservations', async (request, reply) => {
    const user = await actors.resolve(request.cookies[sessionCookieName]);
    const body = asRecord(request.body);
    const eventId = typeof body.eventId === 'string' ? body.eventId : '';
    return reply.code(201).send({ reservation: await ticketing.commands.reservePlace.execute({ eventId, actorId: user.id }) });
  });
  app.get<{ Params: { id: string } }>('/api/reservations/:id', async request => {
    const user = await actors.resolve(request.cookies[sessionCookieName]);
    const query = { reservationId: request.params.id, actorId: user.id };
    // Autoriser avant la maintenance pour conserver les refus sans mutation.
    await ticketing.queries.getMyReservation.execute(query);
    await ticketing.commands.expirePendingReservations.execute({});
    return { reservation: await ticketing.queries.getMyReservation.execute(query) };
  });
  app.post<{ Params: { id: string } }>('/api/reservations/:id/checkout', async request => {
    const user = await actors.resolve(request.cookies[sessionCookieName]);
    const body = asRecord(request.body);
    const scenario = typeof body.scenario === 'string' ? body.scenario : 'success';
    return ticketing.commands.checkoutReservation.execute({ reservationId: request.params.id, actorId: user.id, scenario });
  });
}
