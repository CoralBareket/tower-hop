import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { createCombo, onLand, tickCombo } from '../src/core/combo';

describe('combo', () => {
  it('two multi-floor jumps then a single-floor landing pays floors²', () => {
    const c = createCombo();
    expect(onLand(c, 3)).toBeNull();
    expect(onLand(c, 6)).toBeNull();
    expect(onLand(c, 7)).toEqual({ jumps: 2, floors: 6, bonus: 36 });
    expect(c.jumps).toBe(0);
  });

  it('a single qualifying jump is not a combo', () => {
    const c = createCombo();
    onLand(c, 2);
    expect(onLand(c, 3)).toBeNull();
  });

  it('expires after the timeout', () => {
    const c = createCombo();
    onLand(c, 2);
    onLand(c, 4);
    expect(tickCombo(c, TUNING.comboTimeout - 0.1)).toBeNull();
    expect(tickCombo(c, 0.2)).toEqual({ jumps: 2, floors: 4, bonus: 16 });
  });

  it('landing lower ends the combo', () => {
    const c = createCombo();
    onLand(c, 2);
    onLand(c, 5);
    expect(onLand(c, 4)?.floors).toBe(5);
  });
});
