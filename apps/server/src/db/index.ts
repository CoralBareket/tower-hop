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

/** Production / Neon: a real Postgres server. Migrations run on startup. */
export async function connectPostgres(url: string): Promise<DbConnection> {
  const { default: postgres } = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');
  // Neon URLs carry `channel_binding=require`, which postgres.js doesn't understand and would
  // forward to the server as a bogus runtime parameter. TLS still comes from `sslmode=require`.
  const parsed = new URL(url);
  parsed.searchParams.delete('channel_binding');
  const client = postgres(parsed.toString(), { max: 5, onnotice: () => {} });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
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
