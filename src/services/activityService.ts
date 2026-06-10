/**
 * Activity log service — a lightweight event feed for the game.
 */

import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { ActivityLogEntry, ActivityType } from '@/types';

const col = collection(db, COLLECTIONS.activityLog);

/** Append an entry to the activity feed. Fire-and-forget friendly. */
export async function logActivity(
  eventId: string,
  type: ActivityType,
  message: string,
  playerId?: string,
): Promise<void> {
  const entry: Omit<ActivityLogEntry, 'id'> = {
    eventId,
    type,
    message,
    ...(playerId ? { playerId } : {}),
    createdAt: Date.now(),
  };
  await addDoc(col, entry);
}

/**
 * Real-time subscription to an event's most recent activity.
 * Sorted/capped in memory so no composite index is required.
 */
export function subscribeActivity(
  eventId: string,
  cb: (entries: ActivityLogEntry[]) => void,
  max = 100,
): () => void {
  const q = query(col, where('eventId', '==', eventId));
  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as ActivityLogEntry,
      );
      entries.sort((a, b) => b.createdAt - a.createdAt);
      cb(entries.slice(0, max));
    },
    (err) => console.error('[activity] subscription error', err),
  );
}
