import { TUNING, type Tuning } from '../config/tuning';
import type { Platform } from './physics';

/** mulberry32 — tiny, fast, deterministic PRNG. */
function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Each floor gets its own RNG derived from (seed, floor), so any floor can be generated
 * on demand, in any order, and always comes out identical for the same seed.
 * (That's also what makes "same seed = same tower" replays / daily challenges trivial later.)
 */
export function rngFor(seed: number, floor: number): () => number {
  return mulberry32((seed ^ Math.imul(floor + 1, 0x9e3779b1)) >>> 0);
}

export function platformForFloor(floor: number, seed: number, t: Tuning = TUNING): Platform {
  const y = -floor * t.floorSpacing;
  if (floor % t.fullWidthEvery === 0) return { floor, y, x1: t.wallLeft, x2: t.wallRight };

  const rng = rngFor(seed, floor);
  const inner = t.wallRight - t.wallLeft;
  const progress = Math.min(floor / t.widthShrinkFloors, 1);
  const base = t.platformMaxWidth + (t.platformMinWidth - t.platformMaxWidth) * progress;
  const width = Math.min(inner, Math.round(base * (0.85 + rng() * 0.3)));
  const x1 = Math.round(t.wallLeft + rng() * (inner - width));
  return { floor, y, x1, x2: x1 + width };
}

export function themeIndexForFloor(floor: number, t: Tuning = TUNING): number {
  return Math.floor(Math.max(0, floor) / t.themeEvery);
}
