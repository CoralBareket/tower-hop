import { TUNING, type Tuning } from '../config/tuning';

/**
 * Turns horizontal run speed into upward launch velocity (px/s, positive = up).
 *
 * This is the single most important "feel" function in the game: it decides whether
 * building up speed before a jump is worth it, and how big a "huge jump" can get.
 *
 * Linear model: every px/s of run speed adds the same lift, so the payoff of a run-up is
 * predictable — standing ≈ 1.8 floors, full sprint ≈ 4.3 floors. Capped at jumpMax.
 *
 * @param speed absolute horizontal speed at take-off, in range 0..t.maxRunSpeed
 * @returns launch speed (positive number). Jump height ≈ v² / (2 · t.gravity).
 */
export function computeJumpVelocity(speed: number, t: Tuning = TUNING): number {
  const runSpeed = Math.min(Math.max(speed, 0), t.maxRunSpeed);
  const bonus = runSpeed * t.jumpSpeedBoost;
  return Math.min(t.jumpBase + bonus, t.jumpMax);
}
