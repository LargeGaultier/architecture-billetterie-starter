import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const migration = await readFile(join(process.cwd(), 'db', 'migrations', '001_init.sql'), 'utf8');
  const seed = await readFile(join(process.cwd(), 'db', 'seeds', '001_demo.sql'), 'utf8');
  await pool.query(migration);
  await pool.query(seed);
  console.log('Migrations et données fictives prêtes.');
} finally {
  await pool.end();
}
