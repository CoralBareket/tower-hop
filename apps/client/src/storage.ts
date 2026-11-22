const KEY = 'towerhop:best';
/** Key used before the game was renamed — read once so players keep their on-device best. */
const LEGACY_KEY = 'summit-hop:best';

/** localStorage can throw (private mode, blocked storage) — the game must still work without it. */
export function loadBest(): number {
  try {
    const current = localStorage.getItem(KEY);
    if (current !== null) return Number(current) || 0;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      localStorage.setItem(KEY, legacy);
      localStorage.removeItem(LEGACY_KEY);
      return Number(legacy) || 0;
    }
    return 0;
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
