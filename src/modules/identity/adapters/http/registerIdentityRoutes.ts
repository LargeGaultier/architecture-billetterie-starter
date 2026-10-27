import type { FastifyInstance } from 'fastify';
import type { IdentityApi } from '../../contracts/IdentityApi.js';
import type { IdentityHttpOptions } from '../../contracts/IdentityHttpOptions.js';
import { asRecord } from '../../../../shared/adapters/http/asRecord.js';
import { sessionCookieName } from '../../../../shared/adapters/http/sessionCookie.js';

export function registerIdentityRoutes(app: FastifyInstance, identity: IdentityApi, options: IdentityHttpOptions): void {
  const cookieOptions = { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: options.secureCookies };
  app.post('/api/auth/login', async (request, reply) => {
    const body = asRecord(request.body);
    const result = await identity.commands.loginUser.execute({ login: body.login, password: body.password, previousSessionId: request.cookies[sessionCookieName] });
    reply.setCookie(sessionCookieName, result.sessionId, { ...cookieOptions, maxAge: Math.floor(options.sessionTtlMs / 1000) });
    return { user: result.user };
  });
  app.get('/api/auth/me', async request => ({ user: await identity.queries.getCurrentUser.execute({ sessionId: request.cookies[sessionCookieName] }) }));
  app.post('/api/auth/logout', async (request, reply) => {
    await identity.commands.logoutUser.execute({ sessionId: request.cookies[sessionCookieName] });
    return reply.clearCookie(sessionCookieName, cookieOptions).code(204).send();
  });
}
