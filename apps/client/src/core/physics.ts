import { TUNING, type Tuning } from '../config/tuning';
import { computeJumpVelocity } from './jump';

export interface PlayerState {
  /** Center of the feet. */
  x: number;
  /** Bottom of the feet (world y, +down). */
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  /** Floor number the player last stood on. */
  floor: number;
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jump: boolean;
}

/** One-way platform: solid only from above. `y` is the top surface. */
export interface Platform {
  floor: number;
  y: number;
  x1: number;
  x2: number;
}

export interface StepEvents {
  jumped: boolean;
  /** Floor number landed on during this step, or null. */
  landedFloor: number | null;
  bouncedWall: boolean;
}

const overlaps = (x: number, half: number, p: Platform) => x + half > p.x1 && x - half < p.x2;

/**
 * Advances the player by one fixed step. Mutates `p` in place (hot path, 60×/s)
 * and reports what happened so game logic (combos, score, sfx) can react.
 * Pure of rendering/engine concerns → fully unit-testable.
 */
export function stepPlayer(
  p: PlayerState,
  input: PlayerInput,
  platforms: readonly Platform[],
  dt: number,
  t: Tuning = TUNING,
): StepEvents {
  const events: StepEvents = { jumped: false, landedFloor: null, bouncedWall: false };
  const half = t.playerWidth / 2;

  // --- Horizontal acceleration / friction ---
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) {
    p.vx += dir * (p.onGround ? t.runAccel : t.airAccel) * dt;
    // Turning around on the ground brakes extra hard, so direction changes feel snappy.
    if (p.onGround && Math.sign(p.vx) === -dir) p.vx += dir * t.groundFriction * dt;
  } else if (p.onGround) {
    const dec = t.groundFriction * dt;
    p.vx = Math.abs(p.vx) <= dec ? 0 : p.vx - Math.sign(p.vx) * dec;
  }
  p.vx = Math.max(-t.maxRunSpeed, Math.min(t.maxRunSpeed, p.vx));

  // --- Jump ---
  if (input.jump && p.onGround) {
    p.vy = -computeJumpVelocity(Math.abs(p.vx), t);
    p.onGround = false;
    events.jumped = true;
  }

  // --- Horizontal move + walls (mid-air: bounce and keep momentum; on ground: stop) ---
  p.x += p.vx * dt;
  if (p.x - half < t.wallLeft && p.vx <= 0) {
    p.x = t.wallLeft + half;
    events.bouncedWall = !p.onGround && p.vx !== 0;
    p.vx = p.onGround ? 0 : -p.vx * t.wallBounce;
  } else if (p.x + half > t.wallRight && p.vx >= 0) {
    p.x = t.wallRight - half;
    events.bouncedWall = !p.onGround && p.vx !== 0;
    p.vx = p.onGround ? 0 : -p.vx * t.wallBounce;
  }

  // --- Still supported? (walking off an edge) ---
  if (p.onGround) {
    const under = platforms.find((pl) => pl.floor === p.floor);
    if (!under || !overlaps(p.x, half, under)) p.onGround = false;
  }

  // --- Vertical move + one-way landing ---
  if (!p.onGround) {
    p.vy += t.gravity * dt;
    const prevY = p.y;
    p.y += p.vy * dt;
    if (p.vy > 0) {
      let best: Platform | null = null;
      for (const pl of platforms) {
        if (prevY <= pl.y && p.y >= pl.y && overlaps(p.x, half, pl)) {
          if (!best || pl.y < best.y) best = pl; // first surface crossed while falling
        }
      }
      if (best) {
        p.y = best.y;
        p.vy = 0;
        p.onGround = true;
        p.floor = best.floor;
        events.landedFloor = best.floor;
      }
    }
  }

  return events;
}
