import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PublicUser } from '@summit-hop/shared';
import type { Db } from './db/index.ts';
import { sessions, users } from './db/schema.ts';

export const SESSION_COOKIE = 'sh_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// ---------- passwords (argon2id, library defaults) ----------

export const hashPassword = (password: string) => hash(password);

let dummyHash: Promise<string> | null = null;

/**
 * Verifies a password. When the user doesn't exist we still run a real argon2 verify against a
 * dummy hash, so response time doesn't reveal which usernames exist.
 */
export async function verifyPassword(passwordHash: string | null, password: string) {
  if (passwordHash === null) {
    dummyHash ??= hash('summit-hop-dummy-password');
    await verify(await dummyHash, password);
    return false;
  }
  return verify(passwordHash, password);
}

// ---------- users ----------

export async function findUserByUsername(db: Db, username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.username})`, username.toLowerCase()))
    .limit(1);
  return user ?? null;
}

// ---------- sessions (opaque token in cookie, hash in DB) ----------

export async function startSession(db: Db, reply: FastifyReply, userId: string, secure: boolean) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  // Opportunistic cleanup of this user's expired sessions.
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  await db.insert(sessions).values({ tokenHash: sha256(token), userId, expiresAt });
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true, // JS can't read it → XSS can't steal it
    secure, // HTTPS only in production
    sameSite: 'lax', // not sent on cross-site POSTs → basic CSRF protection
    path: '/',
    expires: expiresAt,
  });
}

export async function endSession(db: Db, req: FastifyRequest, reply: FastifyReply) {
  const token = req.cookies[SESSION_COOKIE];
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

export async function currentUser(db: Db, req: FastifyRequest): Promise<PublicUser | null> {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, username: users.username })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

/** Postgres unique_violation (23505), possibly wrapped by the driver/ORM. */
export function isUniqueViolation(e: unknown): boolean {
  for (
    let cur = e as { code?: string; cause?: unknown } | undefined;
    cur;
    cur = cur.cause as typeof cur
  ) {
    if (cur.code === '23505') return true;
  }
  return false;
}
