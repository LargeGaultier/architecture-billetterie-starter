import { spawnSync } from 'node:child_process';
const urls = { identity: process.env.IDENTITY_DATABASE_URL, ticketing: process.env.DATABASE_URL, payments: process.env.PAYMENTS_DATABASE_URL };
if (Object.values(urls).some(url => !url)) throw new Error('Les trois URL de bases de test sont requises.');
for (const [service, url] of Object.entries(urls)) {
  const result = spawnSync(process.execPath, ['dist/migrate.js'], { env: { ...process.env, SERVICE_NAME: service, DATABASE_URL: url }, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
