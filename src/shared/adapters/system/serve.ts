import type { FastifyInstance } from 'fastify';
import { numberFromEnv } from './environment.js';
export async function serve(app: FastifyInstance): Promise<void> {
  const stop = async () => { await app.close(); };
  process.once('SIGINT', () => { void stop(); });
  process.once('SIGTERM', () => { void stop(); });
  try { await app.listen({ host: '0.0.0.0', port: numberFromEnv('PORT', 3000, 1) }); }
  catch (error) { app.log.error(error); await stop(); process.exitCode = 1; }
}
