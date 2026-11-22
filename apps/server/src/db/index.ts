import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema.ts';

export { schema };

/** Driver-agnostic handle: routes work the same on real Postgres (Neon) and PGlite. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export interface DbConnection {
  db: Db;
  close: () => Promise<void>;
}

const MIGRATIONS = fileURLToPath(new URL('../../drizzle', import.meta.url));

/**
 * Neon URLs carry `channel_binding=require`, which postgres.js doesn't understand and would
 * forward to the server as a bogus runtime parameter. TLS still comes from `sslmode=require`.
 */
function forPostgresJs(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete('channel_binding');
  return parsed.toString();
}

/**
 * Production / Neon: a real Postgres server.
 *
 * Neon gives two URLs for the same database:
 *  - `url` (pooled, `-pooler` host → PgBouncer in transaction mode): normal app queries.
 *  - `migrationUrl` (direct/unpooled): schema migrations, which need a real session.
 * Migrations run once on startup over a short-lived direct connection, then it's closed.
 */
export async function connectPostgres(url: string, migrationUrl = url): Promise<DbConnection> {
  const { default: postgres } = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');

  const direct = postgres(forPostgresJs(migrationUrl), { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(direct, { schema }), { migrationsFolder: MIGRATIONS });
  } finally {
    await direct.end();
  }

  // prepare: false — named prepared statements don't survive PgBouncer transaction pooling.
  const client = postgres(forPostgresJs(url), { max: 5, prepare: false, onnotice: () => {} });
  const db = drizzle(client, { schema });
  return { db: db as unknown as Db, close: () => client.end() };
}

/**
 * Local dev + tests: PGlite is real Postgres compiled to WASM, running in-process.
 * No install, no Docker. `dataDir` persists to disk; omit it for a throwaway in-memory DB.
 */
export async function connectPglite(dataDir?: string): Promise<DbConnection> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  if (dataDir) mkdirSync(dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return { db: db as unknown as Db, close: () => client.close() };
}
