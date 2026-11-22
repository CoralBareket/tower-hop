/**
 * Every number that shapes how the game *feels* lives here.
 * Units: pixels and seconds (velocities in px/s, accelerations in px/s²).
 * World coordinates follow Phaser: +y points DOWN, so climbing means y gets more negative.
 */
export const VIEW = { width: 480, height: 640 };

export const TUNING = {
  /** Fixed simulation step — physics always advances in 1/60 s slices, regardless of FPS. */
  step: 1 / 60,

  // Tower shaft (inner play area between the two side walls)
  wallLeft: 32,
  wallRight: 448,

  // Player hitbox (x = center of feet, y = bottom of feet)
  playerWidth: 24,
  playerHeight: 34,

  // Horizontal movement
  runAccel: 1500,
  airAccel: 1100,
  groundFriction: 1800,
  maxRunSpeed: 560,
  /** Fraction of horizontal speed kept when bouncing off a wall mid-air. */
  wallBounce: 0.9,

  // Vertical movement
  gravity: 2600,
  /** Launch speed of a standing jump (≈ 1.8 floors high). */
  jumpBase: 860,
  /** Extra launch speed per 1 px/s of run speed — used by computeJumpVelocity. */
  jumpSpeedBoost: 0.85,
  /** Hard cap on launch speed. */
  jumpMax: 1500,

  // Tower layout
  floorSpacing: 80,
  platformThickness: 16,
  platformMaxWidth: 210,
  platformMinWidth: 80,
  /** Floors over which platforms shrink from max to min width. */
  widthShrinkFloors: 400,
  /** Every Nth floor spans the full shaft (a "rest" floor). */
  fullWidthEvery: 50,
  /** Visual theme changes every N floors. */
  themeEvery: 100,

  // Combos
  comboTimeout: 3,
  /** A jump must gain at least this many floors to count toward a combo. */
  comboMinFloorJump: 2,
  /** A combo must contain at least this many qualifying jumps to score. */
  comboMinJumps: 2,

  // Auto-scroll ("the tower rises")
  scrollStartFloor: 5,
  scrollBaseSpeed: 45,
  scrollSpeedStep: 35,
  scrollLevelSeconds: 30,
  scrollMaxLevel: 6,
  /** Camera follows the player once they climb above this fraction of the screen height. */
  followTopFraction: 0.3,
};

export type Tuning = typeof TUNING;
