import { count, desc, eq, gt, max } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import {
  ScoreSubmitSchema,
  scoreProblem,
  type ApiError,
  type LeaderboardResponse,
  type ScoreResponse,
} from '@summit-hop/shared';
import { currentUser } from '../auth.ts';
import type { Db } from '../db/index.ts';
import { scores, users } from '../db/schema.ts';

export const LEADERBOARD_SIZE = 10;

export const scoreRoutes: FastifyPluginAsync<{ db: Db }> = async (app, { db }) => {
  app.post(
    '/scores',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const user = await currentUser(db, req);
      if (!user) return reply.code(401).send({ error: 'Log in to save scores' } satisfies ApiError);

      const parsed = ScoreSubmitSchema.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send({ error: parsed.error.issues[0].message } satisfies ApiError);
      const problem = scoreProblem(parsed.data);
      if (problem)
        return reply.code(422).send({ error: `Score rejected: ${problem}` } satisfies ApiError);

      await db.insert(scores).values({ userId: user.id, ...parsed.data });

      const [mine] = await db
        .select({ best: max(scores.score) })
        .from(scores)
        .where(eq(scores.userId, user.id));
      const best = mine?.best ?? 0;
      // Rank = 1 + number of players whose personal best beats mine.
      const bests = db
        .select({ userId: scores.userId, best: max(scores.score).as('best') })
        .from(scores)
        .groupBy(scores.userId)
        .as('bests');
      const [ahead] = await db.select({ n: count() }).from(bests).where(gt(bests.best, best));
      return { best, rank: (ahead?.n ?? 0) + 1 } satisfies ScoreResponse;
    },
  );

  app.get('/leaderboard', async () => {
    const best = max(scores.score);
    const rows = await db
      .select({ username: users.username, best })
      .from(scores)
      .innerJoin(users, eq(users.id, scores.userId))
      .groupBy(users.id, users.username)
      .orderBy(desc(best), users.username)
      .limit(LEADERBOARD_SIZE);
    return {
      entries: rows.map((r) => ({ username: r.username, best: r.best ?? 0 })),
    } satisfies LeaderboardResponse;
  });
};
