import { eq, max } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import {
  CredentialsSchema,
  type ApiError,
  type AuthResponse,
  type MeResponse,
} from '@towerhop/shared';
import {
  currentUser,
  endSession,
  findUserByUsername,
  hashPassword,
  isUniqueViolation,
  startSession,
  verifyPassword,
} from '../auth.ts';
import type { Db } from '../db/index.ts';
import { scores, users } from '../db/schema.ts';

export interface AuthRouteOptions {
  db: Db;
  secureCookies: boolean;
  authRateLimit: number;
}

const INVALID: ApiError = { error: 'Invalid username or password' };

export const authRoutes: FastifyPluginAsync<AuthRouteOptions> = async (
  app,
  { db, secureCookies, authRateLimit },
) => {
  const limited = { rateLimit: { max: authRateLimit, timeWindow: '1 minute' } };

  app.post('/auth/signup', { config: limited }, async (req, reply) => {
    const parsed = CredentialsSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ error: parsed.error.issues[0].message } satisfies ApiError);
    const { username, password } = parsed.data;

    const taken: ApiError = { error: 'That username is taken' };
    if (await findUserByUsername(db, username)) return reply.code(409).send(taken);
    try {
      const [user] = await db
        .insert(users)
        .values({ username, passwordHash: await hashPassword(password) })
        .returning({ id: users.id, username: users.username });
      await startSession(db, reply, user.id, secureCookies);
      return reply.code(201).send({ user } satisfies AuthResponse);
    } catch (e) {
      if (isUniqueViolation(e)) return reply.code(409).send(taken); // lost a signup race
      throw e;
    }
  });

  app.post('/auth/login', { config: limited }, async (req, reply) => {
    const parsed = CredentialsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(401).send(INVALID);
    const user = await findUserByUsername(db, parsed.data.username);
    const ok = await verifyPassword(user?.passwordHash ?? null, parsed.data.password);
    if (!user || !ok) return reply.code(401).send(INVALID);
    await startSession(db, reply, user.id, secureCookies);
    return { user: { id: user.id, username: user.username } } satisfies AuthResponse;
  });

  app.post('/auth/logout', async (req, reply) => {
    await endSession(db, req, reply);
    return { ok: true };
  });

  app.get('/me', async (req, reply) => {
    const user = await currentUser(db, req);
    if (!user) return reply.code(401).send({ error: 'Not logged in' } satisfies ApiError);
    const [row] = await db
      .select({ best: max(scores.score) })
      .from(scores)
      .where(eq(scores.userId, user.id));
    return { user, best: row?.best ?? 0 } satisfies MeResponse;
  });
};
