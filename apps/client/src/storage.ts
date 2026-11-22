const KEY = 'summit-hop:best';

/** localStorage can throw (private mode, blocked storage) — the game must still work without it. */
export function loadBest(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number): boolean {
  if (score <= loadBest()) return false;
  try {
    localStorage.setItem(KEY, String(score));
  } catch {
    /* ignore */
  }
  return true;
}
