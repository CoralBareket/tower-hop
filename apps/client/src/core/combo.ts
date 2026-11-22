import { TUNING, type Tuning } from '../config/tuning';

/**
 * Combo rules:
 *  - A landing that gains ≥ comboMinFloorJump floors starts/extends the combo and resets the timer.
 *  - Any other landing (1 floor, same floor, falling down) ends it — so does the timer running out.
 *  - It only scores if it contained ≥ comboMinJumps qualifying jumps. Bonus = floors².
 */
export interface ComboState {
  lastFloor: number;
  jumps: number;
  floors: number;
  /** Seconds left before the combo expires. */
  timer: number;
}

export interface ComboResult {
  jumps: number;
  floors: number;
  bonus: number;
}

export const createCombo = (): ComboState => ({ lastFloor: 0, jumps: 0, floors: 0, timer: 0 });

export function finishCombo(c: ComboState, t: Tuning = TUNING): ComboResult | null {
  const result =
    c.jumps >= t.comboMinJumps ? { jumps: c.jumps, floors: c.floors, bonus: c.floors ** 2 } : null;
  c.jumps = 0;
  c.floors = 0;
  c.timer = 0;
  return result;
}

export function onLand(c: ComboState, floor: number, t: Tuning = TUNING): ComboResult | null {
  const gained = floor - c.lastFloor;
  c.lastFloor = floor;
  if (gained >= t.comboMinFloorJump) {
    c.jumps += 1;
    c.floors += gained;
    c.timer = t.comboTimeout;
    return null;
  }
  return c.jumps > 0 ? finishCombo(c, t) : null;
}

export function tickCombo(c: ComboState, dt: number, t: Tuning = TUNING): ComboResult | null {
  if (c.jumps === 0) return null;
  c.timer -= dt;
  return c.timer <= 0 ? finishCombo(c, t) : null;
}
