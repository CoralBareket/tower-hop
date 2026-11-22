import { describe, expect, it } from 'vitest';
import { CredentialsSchema, scoreProblem } from '../src/index.ts';

const run = { score: 0, floor: 0, bestCombo: 0, durationMs: 0 };

describe('scoreProblem', () => {
  it('accepts honest runs', () => {
    expect(scoreProblem(run)).toBeNull();
    expect(
      scoreProblem({ score: 1000 + 36, floor: 100, bestCombo: 6, durationMs: 60_000 }),
    ).toBeNull();
    expect(
      scoreProblem({ score: 100 * 10 + 100 ** 2, floor: 100, bestCombo: 100, durationMs: 60_000 }),
    ).toBeNull();
  });

  it('rejects impossible runs', () => {
    expect(scoreProblem({ ...run, score: 999_999, floor: 10, durationMs: 10_000 })).toMatch(
      /too high/,
    );
    expect(scoreProblem({ ...run, score: 5, floor: 10, durationMs: 10_000 })).toMatch(/too low/);
    expect(scoreProblem({ score: 200, floor: 20, bestCombo: 21, durationMs: 10_000 })).toMatch(
      /combo/,
    );
    expect(scoreProblem({ score: 5000, floor: 500, bestCombo: 0, durationMs: 1000 })).toMatch(
      /fast/,
    );
  });
});

describe('CredentialsSchema', () => {
  it('validates usernames and passwords', () => {
    expect(
      CredentialsSchema.safeParse({ username: 'coral_1', password: 'hunter2hunter2' }).success,
    ).toBe(true);
    expect(CredentialsSchema.safeParse({ username: 'a', password: 'hunter2hunter2' }).success).toBe(
      false,
    );
    expect(
      CredentialsSchema.safeParse({ username: 'bad name!', password: 'hunter2hunter2' }).success,
    ).toBe(false);
    expect(CredentialsSchema.safeParse({ username: 'coral', password: 'short' }).success).toBe(
      false,
    );
  });
});
