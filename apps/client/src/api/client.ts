import type {
  AuthResponse,
  Credentials,
  LeaderboardResponse,
  MeResponse,
  ScoreResponse,
  ScoreSubmit,
} from '@towerhop/shared';

export class ApiRequestError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Same-origin fetch: the httpOnly session cookie rides along automatically. */
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(0, 'Server unreachable');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok)
    throw new ApiRequestError(res.status, data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  signup: (c: Credentials) => request<AuthResponse>('/auth/signup', 'POST', c),
  login: (c: Credentials) => request<AuthResponse>('/auth/login', 'POST', c),
  logout: () => request<{ ok: true }>('/auth/logout', 'POST'),
  me: () => request<MeResponse>('/me'),
  submitScore: (s: ScoreSubmit) => request<ScoreResponse>('/scores', 'POST', s),
  leaderboard: () => request<LeaderboardResponse>('/leaderboard'),
};
