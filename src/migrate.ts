import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';
import { seedUsers } from './modules/identity/adapters/postgres/seedUsers.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const directory = join(process.cwd(), 'db', 'migrations');
  for (const file of (await readdir(directory)).filter(file => file.endsWith('.sql')).sort()) {
    await pool.query(await readFile(join(directory, file), 'utf8'));
  }
  const seed = await readFile(join(process.cwd(), 'db', 'seeds', '001_demo.sql'), 'utf8');
  await pool.query(seed);
  await seedUsers(pool);
  console.log('Migrations et données fictives prêtes.');
} finally {
  await pool.end();
}
