# Summit Hop

An endless vertical-climbing platformer: run, build momentum, launch off platforms, bounce off
walls and chain multi-floor combos while the tower rises beneath you. Players can create an
account, save scores, and compete on a global leaderboard. Original name, character, art and audio.

## Run locally

```bash
npm install
npm run dev        # game → http://localhost:5173  (API on :3000, proxied under /api)
npm test           # all workspaces: game rules, API contract, server (against in-process Postgres)
npm run build      # builds the game into apps/client/dist
npm start          # production mode: one server on :3000 serves game + API
```

No database setup needed locally: without `DATABASE_URL`, the server uses **PGlite** (real Postgres
compiled to WASM, running in-process), persisted in `apps/server/.data/`. To use a real Postgres,
copy `apps/server/.env.example` to `apps/server/.env` and set `DATABASE_URL`.

Controls: **← →** (or A/D) run · **Space / ↑** (or W) jump · **M** mute · **L** log in / out on the menu.

## Architecture

```
Browser (Phaser game + HTML login form)
   │  fetch /api/*   (httpOnly session cookie, same origin)
   ▼
Fastify server ── also serves the built game as static files
   │  Drizzle ORM
   ▼
Postgres (Neon in production, PGlite locally/tests)
```

npm-workspaces monorepo:

```
apps/client/      Phaser game (TypeScript + Vite). Rules in src/core/ are pure + unit-tested
apps/server/      Fastify API; src/db/schema.ts → drizzle/ migrations (run on startup)
packages/shared/  zod schemas, API types and score-plausibility rules used by both sides
render.yaml       Render deployment blueprint
```

The server and the shared package run as TypeScript directly on Node 24 (built-in type
stripping) — no server build step.

### API

| Method | Path               |                                                                           |
| ------ | ------------------ | ------------------------------------------------------------------------- |
| POST   | `/api/auth/signup` | `{username, password}` → creates account, sets session cookie             |
| POST   | `/api/auth/login`  | `{username, password}` → sets session cookie                              |
| POST   | `/api/auth/logout` | ends the session                                                          |
| GET    | `/api/me`          | current user + personal best (401 if guest)                               |
| POST   | `/api/scores`      | `{score, floor, bestCombo, durationMs}` (login required) → `{best, rank}` |
| GET    | `/api/leaderboard` | top 10, best score per player                                             |
| GET    | `/api/health`      | health check                                                              |

### Security notes

- Passwords hashed with **argon2id**; login timing is the same whether or not the user exists.
- Sessions are random 256-bit tokens in an `HttpOnly; SameSite=Lax` cookie (`Secure` in production);
  only their SHA-256 is stored, so a DB leak exposes no live sessions. Logout deletes the session.
- Signup/login rate-limited to 10/min per IP; scores to 30/min.
- Scores are sanity-checked server-side: an honest run satisfies
  `floor×10 ≤ score ≤ floor×10 + floor²` (combo floors can't exceed floors climbed) and a plausible
  climb speed. Full replay validation is possible later because the game rules are deterministic.

## Deploy (Render + Neon)

1. **Neon** → create a project → copy the connection string.
2. **Render** → New → Blueprint → select this repo → paste the Neon string as `DATABASE_URL`.
3. Every push to `main` redeploys. Migrations run automatically on startup.

The free Render plan sleeps after 15 minutes idle (first request then takes ~30 s).
