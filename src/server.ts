import { buildGatewayApp } from './adapters/http/buildGatewayApp.js';
import { numberFromEnv, requiredEnv } from './shared/adapters/system/environment.js';
import { serve } from './shared/adapters/system/serve.js';
await serve(buildGatewayApp({ identityUrl: requiredEnv('IDENTITY_URL'), ticketingUrl: requiredEnv('TICKETING_URL'), timeoutMs: numberFromEnv('GATEWAY_TIMEOUT_MS', 7000, 1) }));
