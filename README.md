# Summit Hop

An endless vertical-climbing platformer POC: run, build momentum, launch off platforms,
bounce off walls and chain multi-floor combos while the tower rises beneath you.
Original name, character and art — genre mechanics only.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests for physics / combos / tower generation
npm run build    # static build in dist/ (deployable to GitHub Pages, Netlify, Vercel…)
```

Controls: **← →** (or A/D) run · **Space / ↑** (or W) jump · Esc on game-over returns to menu.

## Architecture

Client-only monolith — no backend needed for single-player. If a global leaderboard is added
later, convert to an npm-workspaces monorepo (`packages/game`, `packages/server`, `packages/shared`).

```
src/
  config/tuning.ts   every "feel" constant (speeds, gravity, jump, scroll, combo rules)
  core/              pure TypeScript game rules — no Phaser imports, fully unit-tested
    physics.ts       fixed-step player movement, wall bounce, one-way platform landing
    jump.ts          run speed → jump velocity (the heart of the game feel)
    combo.ts         multi-floor combo state machine + scoring
    tower.ts         seeded, per-floor deterministic platform generation
    scroll.ts        auto-rising camera that speeds up every 30 s
  render/            Phaser drawing: procedural textures, walls/platforms, HUD, themes
  scenes/            Boot → Menu → Game → GameOver
tests/               Vitest specs for core/
```

**Why custom physics instead of Phaser Arcade?** The game lives or dies on how jumps feel.
A tiny hand-written integrator on a fixed 60 Hz timestep is deterministic (same at any FPS),
trivially tunable from one file, and testable without a browser.

**Score** = highest floor × 10 + Σ(combo floors²). A combo needs ≥ 2 jumps that each gain ≥ 2
floors, and expires 3 s after the last qualifying landing.
