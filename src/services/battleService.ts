/**
 * Battle service — challenge another player, roll d20 + stat modifier, resolve
 * a winner, award XP and hand the loser a funny debuff.
 *
 * Anti-spam guardrail: a player must wait `battleCooldownSeconds` between
 * starting battles (tracked via player.lastBattleAt).
 */

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type {
  Battle,
  EventSettings,
  Player,
  StatBlock,
  StatKey,
} from '@/types';
import { battleRoll } from '@/lib/dice';
import { awardXp, addDebuff } from './playerService';
import { randomDebuff } from '@/lib/seedData';
import { logActivity } from './activityService';

const battlesCol = collection(db, COLLECTIONS.battles);

/** Effective stat value = base stat + active buff/debuff deltas. */
export function effectiveStat(player: Player, stat: StatKey): number {
  const delta = [...player.activeBuffs, ...player.activeDebuffs].reduce(
    (sum, e) => sum + (e.statDelta?.[stat] ?? 0),
    0,
  );
  return player.stats[stat] + delta;
}

/** How long until this player can battle again (ms). 0 = ready now. */
export function battleCooldownRemaining(
  player: Player,
  cooldownSeconds: number,
  now = Date.now(),
): number {
  if (!player.lastBattleAt) return 0;
  const ready = player.lastBattleAt + cooldownSeconds * 1000;
  return Math.max(0, ready - now);
}

export interface ChallengeInput {
  event: { id: string; settings: EventSettings };
  challenger: Player;
  defender: Player;
  challengerStat: StatKey;
}

/** Create a pending battle. Throws if the challenger is on cooldown. */
export async function createChallenge(input: ChallengeInput): Promise<Battle> {
  const { event, challenger, defender, challengerStat } = input;

  const remaining = battleCooldownRemaining(
    challenger,
    event.settings.battleCooldownSeconds,
  );
  if (remaining > 0) {
    throw new Error(
      `On cooldown — wait ${Math.ceil(remaining / 1000)}s before challenging again.`,
    );
  }
  if (challenger.id === defender.id) {
    throw new Error('You cannot challenge yourself.');
  }

  const now = Date.now();
  const data: Omit<Battle, 'id'> = {
    eventId: event.id,
    challengerId: challenger.id,
    defenderId: defender.id,
    challengerName: challenger.name,
    defenderName: defender.name,
    challengerStat,
    defenderStat: null,
    challengerRoll: null,
    defenderRoll: null,
    challengerTotal: null,
    defenderTotal: null,
    winnerId: null,
    loserId: null,
    xpReward: event.settings.battleXpReward,
    status: 'pending',
    createdAt: now,
  };
  const ref = await addDoc(battlesCol, data);

  // Record cooldown start on the challenger.
  await updateDoc(doc(db, COLLECTIONS.players, challenger.id), {
    lastBattleAt: now,
    updatedAt: now,
  });

  await logActivity(
    event.id,
    'battle',
    `${challenger.name} challenged ${defender.name} to a duel of ${challengerStat}! ⚔️`,
    challenger.id,
  );
  return { id: ref.id, ...data };
}

/**
 * Resolve a pending battle: roll for both sides, pick a winner, award XP, and
 * curse the loser with a temporary debuff.
 */
export async function resolveBattle(
  battle: Battle,
  challenger: Player,
  defender: Player,
  defenderStat: StatKey,
  settings: EventSettings,
): Promise<Battle> {
  const cRoll = battleRoll(effectiveStat(challenger, battle.challengerStat));
  const dRoll = battleRoll(effectiveStat(defender, defenderStat));

  // Ties broken in favour of the defender (you must beat them to win).
  const challengerWins = cRoll.total > dRoll.total;
  const winner = challengerWins ? challenger : defender;
  const loser = challengerWins ? defender : challenger;

  const completedAt = Date.now();
  const patch = {
    defenderStat,
    challengerRoll: cRoll.roll,
    defenderRoll: dRoll.roll,
    challengerTotal: cRoll.total,
    defenderTotal: dRoll.total,
    winnerId: winner.id,
    loserId: loser.id,
    status: 'completed' as const,
    completedAt,
  };
  await updateDoc(doc(db, COLLECTIONS.battles, battle.id), patch);

  // Award XP to the winner and debuff the loser.
  await awardXp(
    winner,
    battle.xpReward,
    settings.xpPerLevel,
    `won a battle vs ${loser.name}`,
  );
  await addDebuff(loser, randomDebuff());

  await logActivity(
    battle.eventId,
    'battle',
    `${winner.name} defeated ${loser.name} (${cRoll.total} vs ${dRoll.total})! 🏆`,
    winner.id,
  );

  return { ...battle, ...patch };
}

/**
 * Decline a challenge — and face the consequences. The challenger wins by
 * forfeit (gets the XP) and the chicken who declined cops a random debuff.
 */
export async function declineBattle(
  battle: Battle,
  defender: Player,
  challenger: Player,
  settings: EventSettings,
): Promise<void> {
  const completedAt = Date.now();
  await updateDoc(doc(db, COLLECTIONS.battles, battle.id), {
    winnerId: challenger.id,
    loserId: defender.id,
    status: 'completed' as const,
    completedAt,
  });

  await awardXp(
    challenger,
    battle.xpReward,
    settings.xpPerLevel,
    `won by forfeit vs ${defender.name}`,
  );
  await addDebuff(defender, randomDebuff());

  await logActivity(
    battle.eventId,
    'battle',
    `${defender.name} chickened out of ${challenger.name}'s challenge and was punished! 🐔`,
    defender.id,
  );
}

export async function cancelBattle(battle: Battle): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.battles, battle.id), {
    status: 'cancelled',
  });
  await logActivity(
    battle.eventId,
    'battle',
    `Battle between ${battle.challengerName} and ${battle.defenderName} was cancelled.`,
  );
}

/**
 * All battles for an event, most recent first (history + admin).
 * Sorted/capped in memory so no composite index is required.
 */
export function subscribeBattles(
  eventId: string,
  cb: (battles: Battle[]) => void,
  max = 100,
): () => void {
  const q = query(battlesCol, where('eventId', '==', eventId));
  return onSnapshot(
    q,
    (snap) => {
      const battles = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Battle,
      );
      battles.sort((a, b) => b.createdAt - a.createdAt);
      cb(battles.slice(0, max));
    },
    (err) => console.error('[battles] subscription error', err),
  );
}

/** Convenience: are these stats defined enough to battle? */
export function hasRolled(stats: StatBlock): boolean {
  return Object.values(stats).some((v) => v > 0);
}
