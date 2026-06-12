/**
 * Battle hooks.
 *   useBattles(eventId, playerId?) — live list + handy slices (mine/incoming/active)
 *   useBattle(battleId)            — a single battle, live
 *   useBattleHistory(eventId)      — completed battles, live
 *   useBattleChallenge(attribute)  — a previewable random challenge with reroll
 */
import { useEffect, useMemo, useState } from 'react';
import type { AttributeKey, Battle, BattleChallenge } from '@/types';
import { subscribeBattle, subscribeBattles } from '@/services/battleService';
import { getRandomBattleChallenge } from '@/lib/battleChallenges';

/** Battle statuses that are still "live" (not terminal). */
const ACTIVE_STATUSES: Battle['status'][] = [
  'pending',
  'accepted',
  'inProgress',
  'awaitingJudge',
  'awaitingRolls',
];

export function useBattles(eventId: string | null, playerId?: string | null) {
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

  // Pending challenges where this player is the defender (must respond).
  const incoming = useMemo(
    () =>
      playerId
        ? battles.filter(
            (b) => b.defenderId === playerId && b.status === 'pending',
          )
        : [],
    [battles, playerId],
  );

  // My battles that still need action of some kind.
  const active = useMemo(
    () => mine.filter((b) => ACTIVE_STATUSES.includes(b.status)),
    [mine],
  );

  return { battles, mine, incoming, active, loading };
}

/** Backwards-compatible alias: the list hook used to be called `useBattle`. */
export const useBattle = useBattles;

/** Subscribe to a single battle by id. */
export function useSingleBattle(battleId: string | null | undefined) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!battleId) {
      setBattle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeBattle(battleId, (b) => {
      setBattle(b);
      setLoading(false);
    });
  }, [battleId]);

  return { battle, loading };
}

/** Completed battles for an event (history screen). */
export function useBattleHistory(eventId: string | null) {
  const { battles, loading } = useBattles(eventId);
  const completed = useMemo(
    () => battles.filter((b) => b.status === 'completed'),
    [battles],
  );
  return { battles: completed, loading };
}

/** A previewable random challenge for the chosen attribute, with reroll. */
export function useBattleChallenge(initialAttribute: AttributeKey = 'rizz') {
  const [attribute, setAttribute] = useState<AttributeKey>(initialAttribute);
  const [challenge, setChallenge] = useState<BattleChallenge>(() =>
    getRandomBattleChallenge(initialAttribute),
  );

  // Reroll when the attribute changes.
  useEffect(() => {
    setChallenge(getRandomBattleChallenge(attribute));
  }, [attribute]);

  const reroll = () => setChallenge(getRandomBattleChallenge(attribute));

  return { attribute, setAttribute, challenge, reroll };
}
