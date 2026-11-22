import { z } from 'zod';

/** 3–20 chars, letters/digits/underscore. Uniqueness is case-insensitive (enforced by the DB). */
export const UsernameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{3,20}$/, 'Username must be 3–20 letters, digits or _');

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const CredentialsSchema = z.object({
  username: UsernameSchema,
  password: PasswordSchema,
});
export type Credentials = z.infer<typeof CredentialsSchema>;

export const ScoreSubmitSchema = z.object({
  score: z.int().min(0),
  floor: z.int().min(0),
  bestCombo: z.int().min(0),
  durationMs: z.int().min(0),
});
export type ScoreSubmit = z.infer<typeof ScoreSubmitSchema>;

// ---- Response shapes ----
export interface PublicUser {
  id: string;
  username: string;
}
export interface AuthResponse {
  user: PublicUser;
}
export interface MeResponse {
  user: PublicUser;
  best: number;
}
export interface ScoreResponse {
  best: number;
  rank: number;
}
export interface LeaderboardEntry {
  username: string;
  best: number;
}
export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}
export interface ApiError {
  error: string;
}
