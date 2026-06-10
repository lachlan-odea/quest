/**
 * useBattle — real-time battle history for an event, plus convenient slices
 * for "my battles" and pending challenges aimed at a given player.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Battle } from '@/types';
import { subscribeBattles } from '@/services/battleService';

export function useBattle(eventId: string | null, playerId?: string | null) {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setBattles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeBattles(eventId, (b) => {
      setBattles(b);
      setLoading(false);
    });
  }, [eventId]);

  const mine = useMemo(
    () =>
      playerId
        ? battles.filter(
            (b) => b.challengerId === playerId || b.defenderId === playerId,
          )
        : [],
    [battles, playerId],
  );

  // Pending challenges where this player is the defender (needs to respond).
  const incoming = useMemo(
    () =>
      playerId
        ? battles.filter(
            (b) => b.defenderId === playerId && b.status === 'pending',
          )
        : [],
    [battles, playerId],
  );

  return { battles, mine, incoming, loading };
}
