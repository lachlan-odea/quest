/** Small shared helpers. */

import type { EventSettings } from '@/types';

/** Tailwind className combiner that drops falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Generate a short, human-friendly join code (no ambiguous chars). */
export function generateJoinCode(length = 5): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  let code = '';
  for (let i = 0; i < length; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/** Compute level from total XP using the event's xpPerLevel setting. */
export function levelFromXp(xp: number, xpPerLevel: number): number {
  return Math.floor(xp / Math.max(1, xpPerLevel)) + 1;
}

/** XP progress within the current level, for progress bars. */
export function levelProgress(
  xp: number,
  xpPerLevel: number,
): { level: number; into: number; needed: number; pct: number } {
  const per = Math.max(1, xpPerLevel);
  const level = levelFromXp(xp, per);
  const into = xp % per;
  return { level, into, needed: per, pct: Math.round((into / per) * 100) };
}

/** Default settings applied to a brand-new event. */
export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  questXp: { easy: 50, medium: 100, hard: 200, legendary: 400 },
  battleXpReward: 75,
  battleCooldownSeconds: 120,
  xpPerLevel: 300,
  battlesNeedApproval: false,
};

/** Format an epoch-ms timestamp as a short relative string. */
export function timeAgo(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/** A short non-cryptographic id for client-side embedded objects. */
export function shortId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Pick a random element from a non-empty array. */
export function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
