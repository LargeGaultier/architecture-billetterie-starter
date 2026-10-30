import type { IdentityApi } from '../../contracts/IdentityApi.js';
import type { IdentityHttpOptions } from '../../contracts/IdentityHttpOptions.js';
import { createHttpApp } from '../../../../shared/adapters/http/createHttpApp.js';
import { registerIdentityRoutes } from './registerIdentityRoutes.js';
export function buildIdentityHttpApp(identity: IdentityApi, options: IdentityHttpOptions, healthcheck: () => Promise<void>) {
  const app = createHttpApp(healthcheck);
  registerIdentityRoutes(app, identity, options);
  return app;
}
