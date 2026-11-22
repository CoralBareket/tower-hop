import { fileURLToPath } from 'node:url';
import { buildApp } from './app.ts';
import { connectPglite, connectPostgres } from './db/index.ts';

const production = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;
if (production && !databaseUrl) throw new Error('DATABASE_URL is required in production');

// No DATABASE_URL locally → zero-setup embedded Postgres persisted in apps/server/.data/
const { db, close } = databaseUrl
  ? await connectPostgres(databaseUrl)
  : await connectPglite(fileURLToPath(new URL('../.data/pglite', import.meta.url)));

const app = await buildApp({
  db,
  secureCookies: production,
  clientDist:
    process.env.CLIENT_DIST ?? fileURLToPath(new URL('../../client/dist', import.meta.url)),
  logger: true,
});

await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });
app.log.info(
  databaseUrl
    ? 'Using Postgres from DATABASE_URL'
    : 'Using local PGlite database (apps/server/.data)',
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close();
    await close();
    process.exit(0);
  });
}
