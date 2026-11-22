import type { ScoreSubmit } from './schemas.ts';

/**
 * Score = floor × 10 + Σ(combo floors²). Combos cover disjoint stretches of the climb, so their
 * floor counts sum to ≤ floor, and Σ(fᵢ²) ≤ (Σfᵢ)² ≤ floor². Hence an honest score always lies in
 * [floor × 10, floor × 10 + floor²]. Cheap server-side sanity check — not full anti-cheat.
 */
export const minScoreForFloor = (floor: number) => floor * 10;
export const maxScoreForFloor = (floor: number) => floor * 10 + floor * floor;

/** Generous ceiling on climb speed (the physics tops out around 5 floors/s). */
export const MAX_FLOORS_PER_SECOND = 10;

export function scoreProblem(s: ScoreSubmit): string | null {
  if (s.score < minScoreForFloor(s.floor)) return 'score too low for floor';
  if (s.score > maxScoreForFloor(s.floor)) return 'score too high for floor';
  if (s.bestCombo > s.floor) return 'combo longer than climb';
  if (s.floor > (s.durationMs / 1000) * MAX_FLOORS_PER_SECOND) return 'climbed implausibly fast';
  return null;
}
