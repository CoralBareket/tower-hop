import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { stepPlayer, type Platform, type PlayerInput, type PlayerState } from '../src/core/physics';

const dt = TUNING.step;
const ground: Platform = { floor: 0, y: 0, x1: TUNING.wallLeft, x2: TUNING.wallRight };
const NONE: PlayerInput = { left: false, right: false, jump: false };
const player = (o: Partial<PlayerState> = {}): PlayerState => ({
  x: 240,
  y: 0,
  vx: 0,
  vy: 0,
  onGround: true,
  floor: 0,
  ...o,
});
const run = (p: PlayerState, input: PlayerInput, plats: Platform[], steps: number) => {
  for (let i = 0; i < steps; i++) stepPlayer(p, input, plats, dt);
};

describe('stepPlayer', () => {
  it('accelerates while running and caps at max speed', () => {
    const p = player({ x: 60 });
    run(p, { ...NONE, right: true }, [ground], 5);
    expect(p.vx).toBeGreaterThan(0);
    run(p, { ...NONE, right: true }, [ground], 60);
    expect(p.vx).toBeLessThanOrEqual(TUNING.maxRunSpeed);
  });

  it('friction brings a grounded player to rest', () => {
    const p = player({ vx: 300 });
    run(p, NONE, [ground], 30);
    expect(p.vx).toBe(0);
  });

  it('jumping launches upward and leaves the ground', () => {
    const p = player();
    const ev = stepPlayer(p, { ...NONE, jump: true }, [ground], dt);
    expect(ev.jumped).toBe(true);
    expect(p.onGround).toBe(false);
    expect(p.vy).toBeLessThan(0);
  });

  it('passes up through a one-way platform, then lands on it when falling', () => {
    const ledge: Platform = { floor: 1, y: -TUNING.floorSpacing, x1: 200, x2: 280 };
    const p = player();
    stepPlayer(p, { ...NONE, jump: true }, [ground, ledge], dt);
    let landed: number | null = null;
    for (let i = 0; i < 120 && landed === null; i++)
      landed = stepPlayer(p, NONE, [ground, ledge], dt).landedFloor;
    expect(landed).toBe(1);
    expect(p.y).toBe(ledge.y);
    expect(p.onGround).toBe(true);
  });

  it('bounces off a wall mid-air, keeping most of its speed', () => {
    const p = player({ x: TUNING.wallRight - 14, vx: 400, vy: -500, onGround: false, y: -100 });
    const ev = stepPlayer(p, NONE, [], dt);
    expect(ev.bouncedWall).toBe(true);
    expect(p.vx).toBeCloseTo(-400 * TUNING.wallBounce, 0);
  });

  it('stops against a wall when on the ground', () => {
    const p = player({ x: TUNING.wallRight - 14, vx: 400 });
    stepPlayer(p, { ...NONE, right: true }, [ground], dt);
    expect(p.vx).toBe(0);
    expect(p.x).toBe(TUNING.wallRight - TUNING.playerWidth / 2);
  });

  it('walking off a ledge starts a fall', () => {
    const ledge: Platform = { floor: 3, y: -240, x1: 200, x2: 260 };
    const p = player({ x: 275, y: -240, floor: 3 });
    stepPlayer(p, NONE, [ledge], dt);
    expect(p.onGround).toBe(false);
  });
});
