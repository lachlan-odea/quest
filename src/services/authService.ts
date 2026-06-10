/**
 * Auth service — anonymous Firebase Authentication for the MVP.
 *
 * Each device gets one anonymous auth user, which maps to (at most) one Player
 * document per event via the player's `authUid` field.
 */

import {
  signInAnonymously,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

/** Ensure there is a signed-in (anonymous) user; returns it. */
export async function ensureAnonymousUser(): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function subscribeAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export function currentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}
