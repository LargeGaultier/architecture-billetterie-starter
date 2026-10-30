import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHttpApp } from '../../shared/adapters/http/createHttpApp.js';

export interface Upstreams { identityUrl: string; ticketingUrl: string; timeoutMs: number }
export function buildGatewayApp(upstreams: Upstreams) {
  const app = createHttpApp(async () => {});
  app.route({ method: ['GET', 'POST'], url: '/api/*', handler: async (request, reply) => {
    const base = request.url.startsWith('/api/auth/') ? upstreams.identityUrl : upstreams.ticketingUrl;
    const response = await fetch(base + request.url, {
      method: request.method,
      headers: { ...(request.headers.cookie ? { cookie: request.headers.cookie } : {}),
        ...(request.body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
      signal: AbortSignal.timeout(upstreams.timeoutMs), redirect: 'error',
    });
    const body = await response.text();
    const cookies = response.headers.getSetCookie();
    if (cookies.length) reply.header('set-cookie', cookies);
    const contentType = response.headers.get('content-type');
    if (contentType) reply.type(contentType);
    return reply.code(response.status).send(body);
  } });
  for (const [route, file, type] of [['/', 'index.html', 'text/html; charset=utf-8'], ['/app.css', 'app.css', 'text/css; charset=utf-8'], ['/app.js', 'app.js', 'text/javascript; charset=utf-8']]) {
    app.get(route, async (_request, reply) => reply.type(type).send(await readFile(join(process.cwd(), 'public', file))));
  }
  return app;
}
