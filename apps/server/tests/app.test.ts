import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app.ts';
import { SESSION_COOKIE } from '../src/auth.ts';
import { connectPglite, type DbConnection } from '../src/db/index.ts';

type App = Awaited<ReturnType<typeof buildApp>>;

let conn: DbConnection;
let app: App;
let n = 0;
const uniqueName = (base = 'player') => `${base}${++n}`;
const PASSWORD = 'correct-horse-battery';

const sessionCookie = (res: LightMyRequestResponse) =>
  res.cookies.find((c) => c.name === SESSION_COOKIE);
const cookieHeader = (res: LightMyRequestResponse) => ({
  cookie: `${SESSION_COOKIE}=${sessionCookie(res)!.value}`,
});

const signup = (username: string, password = PASSWORD) =>
  app.inject({ method: 'POST', url: '/api/auth/signup', payload: { username, password } });
const login = (username: string, password = PASSWORD) =>
  app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password } });
const me = (headers = {}) => app.inject({ method: 'GET', url: '/api/me', headers });
const submit = (
  headers: Record<string, string>,
  run: { score: number; floor: number; bestCombo?: number; durationMs?: number },
) =>
  app.inject({
    method: 'POST',
    url: '/api/scores',
    headers,
    payload: { bestCombo: 0, durationMs: 120_000, ...run },
  });

beforeAll(async () => {
  conn = await connectPglite(); // in-memory Postgres, migrations applied
  app = await buildApp({ db: conn.db, authRateLimit: 1000 });
});
afterAll(async () => {
  await app.close();
  await conn.close();
});

describe('auth', () => {
  it('signup creates an account, sets an httpOnly session cookie, and /me sees it', async () => {
    const name = uniqueName();
    const res = await signup(name);
    expect(res.statusCode).toBe(201);
    expect(res.json().user.username).toBe(name);

    const cookie = sessionCookie(res)!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');

    const meRes = await me(cookieHeader(res));
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json()).toMatchObject({ user: { username: name }, best: 0 });
  });

  it('never stores the password in plain text', async () => {
    const name = uniqueName();
    await signup(name);
    const { findUserByUsername } = await import('../src/auth.ts');
    const user = await findUserByUsername(conn.db, name);
    expect(user!.passwordHash).not.toContain(PASSWORD);
    expect(user!.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('rejects duplicate usernames case-insensitively', async () => {
    const name = uniqueName('Coral');
    expect((await signup(name)).statusCode).toBe(201);
    expect((await signup(name.toLowerCase())).statusCode).toBe(409);
  });

  it('rejects invalid usernames and short passwords', async () => {
    expect((await signup('no spaces!')).statusCode).toBe(400);
    expect((await signup(uniqueName(), 'short')).statusCode).toBe(400);
  });

  it('login works with the right password, any case username; fails generically otherwise', async () => {
    const name = uniqueName('Mixed');
    await signup(name);
    const ok = await login(name.toUpperCase());
    expect(ok.statusCode).toBe(200);
    expect(sessionCookie(ok)).toBeDefined();

    const wrongPw = await login(name, 'wrong-password-123');
    const noUser = await login('nobody_here', PASSWORD);
    expect(wrongPw.statusCode).toBe(401);
    expect(noUser.statusCode).toBe(401);
    expect(wrongPw.json()).toEqual(noUser.json()); // no hint which part was wrong
  });

  it('logout ends the session server-side', async () => {
    const res = await signup(uniqueName());
    const headers = cookieHeader(res);
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers });
    expect((await me(headers)).statusCode).toBe(401);
  });

  it('/me without a cookie, or with a forged one, is 401', async () => {
    expect((await me()).statusCode).toBe(401);
    expect((await me({ cookie: `${SESSION_COOKIE}=forged` })).statusCode).toBe(401);
  });
});

describe('scores & leaderboard', () => {
  it('requires login to save a score', async () => {
    expect((await submit({}, { score: 100, floor: 10 })).statusCode).toBe(401);
  });

  it('saves scores, tracks personal best and rank', async () => {
    const headers = cookieHeader(await signup(uniqueName()));
    const first = await submit(headers, { score: 150, floor: 10, bestCombo: 5 });
    expect(first.statusCode).toBe(200);
    expect(first.json().best).toBe(150);
    const worse = await submit(headers, { score: 100, floor: 10 });
    expect(worse.json().best).toBe(150); // best is kept
    expect((await me(headers)).json().best).toBe(150);
  });

  it('rejects impossible scores', async () => {
    const headers = cookieHeader(await signup(uniqueName()));
    const res = await submit(headers, { score: 1_000_000, floor: 10 });
    expect(res.statusCode).toBe(422);
  });

  it('leaderboard lists each player once, by best score, highest first', async () => {
    const a = cookieHeader(await signup(uniqueName('alpha')));
    const b = cookieHeader(await signup(uniqueName('beta')));
    await submit(a, { score: 5000, floor: 400 });
    await submit(a, { score: 4500, floor: 400 });
    await submit(b, { score: 6000, floor: 500 });

    const res = await app.inject({ method: 'GET', url: '/api/leaderboard' });
    const entries: { username: string; best: number }[] = res.json().entries;
    expect(entries.slice(0, 2).map((e) => e.best)).toEqual([6000, 5000]);
    expect(new Set(entries.map((e) => e.username)).size).toBe(entries.length);

    const rankA = await submit(a, { score: 4000, floor: 400 });
    expect(rankA.json().rank).toBe(2);
  });
});

describe('hardening', () => {
  it('rate-limits login attempts per IP', async () => {
    const strict = await buildApp({ db: conn.db, authRateLimit: 3 });
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await strict.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'x_x', password: 'whatever1' },
      });
      codes.push(r.statusCode);
    }
    expect(codes).toEqual([401, 401, 401, 429]);
    await strict.close();
  });

  it('marks cookies Secure when running behind HTTPS', async () => {
    const prod = await buildApp({ db: conn.db, secureCookies: true });
    const res = await prod.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: { username: uniqueName(), password: PASSWORD },
    });
    expect(sessionCookie(res)!.secure).toBe(true);
    await prod.close();
  });

  it('hides database internals when a query fails', async () => {
    const broken = await connectPglite();
    await broken.close(); // every query on this connection now fails
    const brokenApp = await buildApp({ db: broken.db });
    const res = await brokenApp.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'someone', password: PASSWORD },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'Something went wrong' });
    expect(res.body).not.toMatch(/select|users|password_hash/i);
    await brokenApp.close();
  });

  it('keeps useful messages for client errors like malformed JSON', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{not json',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBeTypeOf('string');
  });

  it('health check responds', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/health' })).json()).toEqual({
      status: 'ok',
    });
  });
});
