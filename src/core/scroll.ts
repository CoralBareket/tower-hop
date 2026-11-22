import { TUNING, type Tuning } from '../config/tuning';

/** The rising tower: idle until the player reaches scrollStartFloor, then speeds up every N seconds. */
export interface ScrollState {
  started: boolean;
  elapsed: number;
  level: number;
  /** Current camera rise speed in px/s (0 until started). */
  speed: number;
}

export const createScroll = (): ScrollState => ({ started: false, elapsed: 0, level: 0, speed: 0 });

export function updateScroll(
  s: ScrollState,
  dt: number,
  highestFloor: number,
  t: Tuning = TUNING,
): { levelUp: boolean } {
  if (!s.started && highestFloor >= t.scrollStartFloor) s.started = true;
  if (!s.started) return { levelUp: false };

  s.elapsed += dt;
  const level = Math.min(Math.floor(s.elapsed / t.scrollLevelSeconds), t.scrollMaxLevel);
  const levelUp = level > s.level;
  s.level = level;
  s.speed = t.scrollBaseSpeed + level * t.scrollSpeedStep;
  return { levelUp };
}

/** 0..1 progress toward the next speed-up (drives the HUD clock). */
export function clockFraction(s: ScrollState, t: Tuning = TUNING): number {
  return s.started ? (s.elapsed % t.scrollLevelSeconds) / t.scrollLevelSeconds : 0;
}
