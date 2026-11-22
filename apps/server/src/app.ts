import { existsSync } from 'node:fs';
import Fastify, { type FastifyError } from 'fastify';
import type { ApiError } from '@summit-hop/shared';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import type { Db } from './db/index.ts';
import { authRoutes } from './routes/auth.ts';
import { scoreRoutes } from './routes/scores.ts';

export interface AppOptions {
  db: Db;
  /** true in production (HTTPS). Must be false for plain-http localhost. */
  secureCookies?: boolean;
  /** Built game (apps/client/dist) — served at / so game + API share one origin. */
  clientDist?: string | null;
  logger?: boolean;
  /** Max signup/login attempts per IP per minute. */
  authRateLimit?: number;
}

export async function buildApp(o: AppOptions) {
  // trustProxy: Render terminates TLS in front of us; needed for real client IPs (rate limiting).
  const app = Fastify({ logger: o.logger ?? false, trustProxy: true, bodyLimit: 16 * 1024 });

  // Never send internals (SQL text, stack traces) to the client on a server error — log them
  // instead. 4xx errors (bad JSON, rate limit, …) keep their message since it's useful and safe.
  app.setErrorHandler((err: FastifyError, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) {
      req.log.error({ err }, 'request failed');
      return reply.code(500).send({ error: 'Something went wrong' } satisfies ApiError);
    }
    return reply.code(status).send({ error: err.message } satisfies ApiError);
  });

  await app.register(cookie);
  await app.register(rateLimit, { global: false });

  app.get('/api/health', async () => ({ status: 'ok' }));
  await app.register(authRoutes, {
    prefix: '/api',
    db: o.db,
    secureCookies: o.secureCookies ?? false,
    authRateLimit: o.authRateLimit ?? 10,
  });
  await app.register(scoreRoutes, { prefix: '/api', db: o.db });

  if (o.clientDist && existsSync(o.clientDist)) {
    await app.register(fastifyStatic, { root: o.clientDist });
  }
  return app;
}
