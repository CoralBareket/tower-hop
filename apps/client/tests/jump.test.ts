import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { computeJumpVelocity } from '../src/core/jump';

const floorsHigh = (v: number) => v ** 2 / (2 * TUNING.gravity) / TUNING.floorSpacing;

describe('computeJumpVelocity', () => {
  it('a standing jump uses the base velocity (~1.8 floors)', () => {
    expect(computeJumpVelocity(0)).toBe(TUNING.jumpBase);
    expect(floorsHigh(computeJumpVelocity(0))).toBeGreaterThan(1.5);
  });

  it('running faster always jumps higher', () => {
    let prev = 0;
    for (let s = 0; s <= TUNING.maxRunSpeed; s += 40) {
      const v = computeJumpVelocity(s);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it('a full sprint clears 4+ floors but never exceeds jumpMax', () => {
    expect(floorsHigh(computeJumpVelocity(TUNING.maxRunSpeed))).toBeGreaterThan(4);
    expect(computeJumpVelocity(99999)).toBeLessThanOrEqual(TUNING.jumpMax);
  });
});
