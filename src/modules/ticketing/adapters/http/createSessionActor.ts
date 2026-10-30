import type { CurrentActor } from '../../contracts/CurrentActor.js';
import { BusinessError } from '../../../../shared/domain/BusinessError.js';
import { record, requestJson } from '../../../../shared/adapters/http/requestJson.js';
import { sessionCookieName } from '../../../../shared/adapters/http/sessionCookie.js';
export function createSessionActor(identityUrl: string, timeoutMs: number): CurrentActor {
  return { async resolve(sessionId) {
    if (!sessionId) throw new BusinessError('AUTH_REQUIRED', 'Connectez-vous pour continuer.');
    const body = await requestJson(identityUrl + '/api/auth/me', timeoutMs, { cookie: `${sessionCookieName}=${encodeURIComponent(sessionId)}`, acceptedErrors: ['AUTH_REQUIRED'] });
    const user = record(record(body).user);
    if (typeof user.id !== 'string' || !user.id.trim() || user.id.length > 80 || typeof user.login !== 'string') throw new Error('Contrat Identité invalide.');
    return { id: user.id };
  } };
}
