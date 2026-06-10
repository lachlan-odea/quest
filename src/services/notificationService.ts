/**
 * Notification service — admin broadcasts that pop up for everyone in an event.
 */
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { AppNotification } from '@/types';
import { logActivity } from './activityService';

const col = collection(db, COLLECTIONS.notifications);

export interface SendNotificationInput {
  eventId: string;
  title: string;
  message: string;
  tone?: AppNotification['tone'];
  createdBy: string;
}

/** Broadcast an announcement to everyone in the event (admin only). */
export async function sendNotification(
  input: SendNotificationInput,
): Promise<void> {
  const data: Omit<AppNotification, 'id'> = {
    eventId: input.eventId,
    title: input.title.trim() || 'Announcement',
    message: input.message.trim(),
    tone: input.tone ?? 'info',
    createdBy: input.createdBy,
    createdAt: Date.now(),
  };
  await addDoc(col, data);
  await logActivity(input.eventId, 'event', `📣 ${data.title}: ${data.message}`);
}

/**
 * Real-time subscription to an event's announcements (sorted newest-first in
 * memory so no composite index is required).
 */
export function subscribeNotifications(
  eventId: string,
  cb: (notifications: AppNotification[]) => void,
  max = 30,
): () => void {
  const q = query(col, where('eventId', '==', eventId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AppNotification,
      );
      items.sort((a, b) => b.createdAt - a.createdAt);
      cb(items.slice(0, max));
    },
    (err) => console.error('[notifications] subscription error', err),
  );
}
