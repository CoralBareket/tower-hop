import { TUNING, type Tuning } from '../config/tuning';

/**
 * Turns horizontal run speed into upward launch velocity (px/s, positive = up).
 *
 * This is the single most important "feel" function in the game: it decides whether
 * building up speed before a jump is worth it, and how big a "huge jump" can get.
 *
 * @param speed absolute horizontal speed at take-off, in range 0..t.maxRunSpeed
 * @returns launch speed (positive number). Jump height ≈ v² / (2 · t.gravity).
 *          e.g. 860 → ~142px (≈1.8 floors), 1340 → ~345px (≈4.3 floors)
 */
export function computeJumpVelocity(speed: number, t: Tuning = TUNING): number {
  // TODO(you): make faster running produce higher jumps.
  // Knobs available: t.jumpBase, t.jumpSpeedBoost, t.jumpMax, t.maxRunSpeed.
  // Placeholder: every jump is the same height, regardless of `speed`.
  void speed;
  return t.jumpBase;
}
