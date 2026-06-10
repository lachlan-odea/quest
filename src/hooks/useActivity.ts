/** useActivity — real-time activity feed for an event. */
import { useEffect, useState } from 'react';
import type { ActivityLogEntry } from '@/types';
import { subscribeActivity } from '@/services/activityService';

export function useActivity(eventId: string | null, max = 100) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeActivity(
      eventId,
      (e) => {
        setEntries(e);
        setLoading(false);
      },
      max,
    );
  }, [eventId, max]);

  return { entries, loading };
}
