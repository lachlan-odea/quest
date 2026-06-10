/**
 * useQuests — quests for a single player, and useAllQuests for the admin view.
 */
import { useEffect, useState } from 'react';
import type { Quest } from '@/types';
import { subscribePlayerQuests, subscribeQuests } from '@/services/questService';

export function useQuests(eventId: string | null, playerId: string | null) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || !playerId) {
      setQuests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribePlayerQuests(eventId, playerId, (q) => {
      setQuests(q);
      setLoading(false);
    });
  }, [eventId, playerId]);

  return {
    quests,
    loading,
    active: quests.filter((q) => q.status === 'assigned'),
    completed: quests.filter((q) => q.status === 'completed'),
    failed: quests.filter((q) => q.status === 'failed'),
  };
}

/** Admin view — all quests in the event. */
export function useAllQuests(eventId: string | null) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setQuests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeQuests(eventId, (q) => {
      setQuests(q);
      setLoading(false);
    });
  }, [eventId]);

  return { quests, loading };
}
