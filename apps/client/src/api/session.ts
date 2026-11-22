import type { PublicUser } from '@towerhop/shared';
import { api } from './client';

/**
 * Who's logged in, as far as the client knows. The server is the source of truth (the cookie is
 * httpOnly, so JS can't even see it) — `refresh()` asks it via /api/me.
 */
export const session = {
  user: null as PublicUser | null,
  best: 0,

  async refresh(): Promise<void> {
    try {
      const me = await api.me();
      this.user = me.user;
      this.best = me.best;
    } catch {
      this.clear(); // 401 = guest; network error = play offline as guest
    }
  },

  clear(): void {
    this.user = null;
    this.best = 0;
  },
};
