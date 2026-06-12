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
  ActiveEffect,
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

const effectsOf = (player: Player): ActiveEffect[] => player.activeEffects ?? [];

/**
 * Effective stat value = base stat + active buff/debuff deltas + any Divine
 * Favour `temporaryAttributeModifier`s for this attribute.
 */
export function effectiveStat(player: Player, stat: StatKey): number {
  const buffDelta = [...player.activeBuffs, ...player.activeDebuffs].reduce(
    (sum, e) => sum + (e.statDelta?.[stat] ?? 0),
    0,
  );
  const fxDelta = effectsOf(player).reduce(
    (sum, ae) =>
      sum +
      ae.effects.reduce(
        (s, e) =>
          s +
          (e.type === 'temporaryAttributeModifier' && e.attribute === stat
            ? e.value ?? 0
            : 0),
        0,
      ),
    0,
  );
  return player.stats[stat] + buffDelta + fxDelta;
}

/** Flat d20 modifier from Divine Favour `battleRollModifier` effects. */
export function battleRollBonus(player: Player): number {
  return effectsOf(player).reduce(
    (sum, ae) =>
      sum +
      ae.effects.reduce(
        (s, e) => s + (e.type === 'battleRollModifier' ? e.value ?? 0 : 0),
        0,
      ),
    0,
  );
}

/** Does the player hold an "auto-win next stat roll" blessing? */
export function hasAutoWin(player: Player): boolean {
  return effectsOf(player).some((ae) =>
    ae.effects.some((e) => e.type === 'autoWinNextStatRoll'),
  );
}

/** Is the player blocked from challenging (e.g. Minotaur's Maze)? */
export function hasChallengeRestriction(player: Player): boolean {
  return effectsOf(player).some((ae) =>
    ae.effects.some((e) => e.type === 'challengeRestriction'),
  );
}

/** Active effects remaining after consuming any "until next battle" ones. */
function consumeNextBattle(player: Player): ActiveEffect[] {
  return effectsOf(player).filter(
    (ae) => !ae.effects.some((e) => e.until === 'nextBattle'),
  );
}

/** Write back a player's active effects if a battle consumed any. */
async function persistConsumed(player: Player): Promise<void> {
  const remaining = consumeNextBattle(player);
  if (remaining.length !== effectsOf(player).length) {
    await updateDoc(doc(db, COLLECTIONS.players, player.id), {
      activeEffects: remaining,
      updatedAt: Date.now(),
    });
  }
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
  if (hasChallengeRestriction(challenger)) {
    throw new Error(
      'A curse blocks you from challenging anyone until you complete a quest.',
    );
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

  // Divine Favour flat roll modifiers (e.g. Burden of Olympus -2).
  const cTotal = cRoll.total + battleRollBonus(challenger);
  const dTotal = dRoll.total + battleRollBonus(defender);

  // Auto-win blessings trump the dice; if both hold one, fall back to the roll.
  const cAuto = hasAutoWin(challenger);
  const dAuto = hasAutoWin(defender);
  let challengerWins: boolean;
  if (cAuto && !dAuto) challengerWins = true;
  else if (dAuto && !cAuto) challengerWins = false;
  // Ties broken in favour of the defender (you must beat them to win).
  else challengerWins = cTotal > dTotal;

  const winner = challengerWins ? challenger : defender;
  const loser = challengerWins ? defender : challenger;

  const completedAt = Date.now();
  const patch = {
    defenderStat,
    challengerRoll: cRoll.roll,
    defenderRoll: dRoll.roll,
    challengerTotal: cTotal,
    defenderTotal: dTotal,
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

  // Consume any "until next battle" Divine Favour effects on both sides.
  await persistConsumed(challenger);
  await persistConsumed(defender);

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
