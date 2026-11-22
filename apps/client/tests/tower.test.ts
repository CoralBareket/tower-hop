import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { platformForFloor } from '../src/core/tower';
import { createScroll, updateScroll } from '../src/core/scroll';

describe('tower', () => {
  it('is deterministic per seed', () => {
    expect(platformForFloor(137, 42)).toEqual(platformForFloor(137, 42));
    expect(platformForFloor(137, 42)).not.toEqual(platformForFloor(137, 43));
  });

  it('keeps every platform inside the shaft', () => {
    for (let f = 0; f < 1000; f++) {
      const p = platformForFloor(f, 7);
      expect(p.x1).toBeGreaterThanOrEqual(TUNING.wallLeft);
      expect(p.x2).toBeLessThanOrEqual(TUNING.wallRight);
      expect(p.y).toBe(-f * TUNING.floorSpacing);
    }
  });

  it('makes floor 0 and every 50th floor full-width', () => {
    for (const f of [0, 50, 100]) {
      const p = platformForFloor(f, 1);
      expect([p.x1, p.x2]).toEqual([TUNING.wallLeft, TUNING.wallRight]);
    }
  });

  it('platforms get narrower as you climb', () => {
    const avg = (from: number) => {
      let s = 0;
      for (let f = from + 1; f < from + 40; f++)
        s += platformForFloor(f, 9).x2 - platformForFloor(f, 9).x1;
      return s / 39;
    };
    expect(avg(400)).toBeLessThan(avg(0));
  });
});

describe('scroll', () => {
  it('waits for the start floor, then speeds up each interval', () => {
    const s = createScroll();
    updateScroll(s, 10, TUNING.scrollStartFloor - 1);
    expect(s.speed).toBe(0);
    updateScroll(s, 1, TUNING.scrollStartFloor);
    expect(s.speed).toBe(TUNING.scrollBaseSpeed);
    expect(updateScroll(s, TUNING.scrollLevelSeconds, 10).levelUp).toBe(true);
    expect(s.speed).toBe(TUNING.scrollBaseSpeed + TUNING.scrollSpeedStep);
  });
});
