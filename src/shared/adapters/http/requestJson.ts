import { BusinessError, type BusinessErrorCode } from '../../domain/BusinessError.js';
import { businessErrorStatus } from './businessErrors.js';

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Contrat HTTP invalide.');
  return value as Record<string, unknown>;
}

export async function requestJson(url: string, timeoutMs: number, options: { body?: unknown; cookie?: string; token?: string } = {}): Promise<unknown> {
  const response = await fetch(url, {
    method: options.body === undefined ? 'GET' : 'POST',
    headers: { ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(options.cookie ? { cookie: options.cookie } : {}), ...(options.token ? { 'x-service-token': options.token } : {}) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'error',
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = record(record(body).error);
    const code = error.code;
    if (typeof code === 'string' && Object.hasOwn(businessErrorStatus, code)
      && businessErrorStatus[code as BusinessErrorCode] === response.status && typeof error.message === 'string') {
      throw new BusinessError(code as BusinessErrorCode, error.message);
    }
    throw new Error('Dépendance HTTP indisponible.');
  }
  return body;
}
