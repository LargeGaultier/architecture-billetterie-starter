import type { Pool } from 'pg';
import { buildHttpApp } from '../adapters/http/buildHttpApp.js';
import { createUseCases } from './createUseCases.js';
import type { AuthConfig, TicketingConfig } from './config.js';

export function buildApp(pool: Pool, config: TicketingConfig, authConfig: AuthConfig = {}) {
  return buildHttpApp(createUseCases(pool, config, authConfig), {
    secureCookies: authConfig.secureCookies ?? false,
    sessionTtlMs: authConfig.sessionTtlMs ?? 30 * 60_000,
  }, async () => { await pool.query('SELECT 1'); });
}
