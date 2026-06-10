/**
 * useNotifications — subscribes to event announcements and surfaces the newest
 * one this device hasn't dismissed yet. Dismissals are remembered per-event in
 * localStorage so a refresh doesn't re-show old announcements.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppNotification } from '@/types';
import { subscribeNotifications } from '@/services/notificationService';

function seenKey(eventId: string) {
  return `qftb.seenNotif.${eventId}`;
}

export function useNotifications(eventId: string | null) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [seenAt, setSeenAt] = useState<number>(() => 0);

  // Load last-seen timestamp for this event.
  useEffect(() => {
    if (!eventId) return;
    const raw = localStorage.getItem(seenKey(eventId));
    setSeenAt(raw ? Number(raw) : 0);
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setItems([]);
      return;
    }
    return subscribeNotifications(eventId, setItems);
  }, [eventId]);

  // The newest announcement created after our last-seen mark.
  const unread = useMemo(
    () => items.filter((n) => n.createdAt > seenAt),
    [items, seenAt],
  );
  const current = unread.length > 0 ? unread[0] : null;

  const dismiss = useCallback(
    (notif: AppNotification) => {
      if (!eventId) return;
      const ts = Math.max(seenAt, notif.createdAt);
      localStorage.setItem(seenKey(eventId), String(ts));
      setSeenAt(ts);
    },
    [eventId, seenAt],
  );

  return { items, unread, current, dismiss };
}
