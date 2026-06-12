/**
 * Battle service — the hybrid party-game + stat-roll battle system.
 *
 * Lifecycle:
 *   pending → accepted/inProgress → awaitingRolls (real-world winner recorded)
 *           → completed
 *   (or declined / cancelled)
 *
 * Design principle: the REAL-WORLD party game decides the official winner
 * (Victory XP). The STAT ROLL decides who the gods favour (Divine Favour /
 * bonus). Winning BOTH is "Glory". The judge records the real-world winner;
 * each player rolls their own d20 + attribute modifier.
 *
 * MVP / hardening note: like XP and Divine Favour, battle completion runs
 * client-side for a fast, offline-tolerant party game (trust-based). Every
 * function is keyed by ids and loads fresh docs, so the whole completion step
 * can be lifted into a Firebase Cloud Function later without changing callers.
 * See README "Hardening".
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type {
  AttributeKey,
  Battle,
  BattleChallenge,
  BattleJudgeMode,
  Player,
} from '@/types';
import {
  calculateBattleRoll,
  canPlayerChallenge,
  canPlayerDeclineChallenge,
  consumeBattleEffects,
  determineGloryWinner,
  determineStatRollWinner,
} from '@/lib/battleUtils';
import { getRandomBattleChallenge } from '@/lib/battleChallenges';
import { STAT_LABELS } from '@/lib/dice';
import { awardXp } from './playerService';
import { getEvent } from './eventService';
import { rollDivineFavour } from './divineFavourService';
import { logActivity } from './activityService';

const battlesCol = collection(db, COLLECTIONS.battles);

// ---- Loaders ----------------------------------------------------------------

async function loadBattle(battleId: string): Promise<Battle | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.battles, battleId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Battle) : null;
}

async function loadPlayer(playerId: string): Promise<Player | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.players, playerId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Player) : null;
}

// ---- Cooldown ---------------------------------------------------------------

/** How long until this player can battle again (ms). 0 = ready now. */
export function battleCooldownRemaining(
  player: Player,
  cooldownMinutes: number,
  now = Date.now(),
): number {
  if (!player.lastBattleAt) return 0;
  const ready = player.lastBattleAt + cooldownMinutes * 60_000;
  return Math.max(0, ready - now);
}

// ---- Create / accept / decline ---------------------------------------------

export interface CreateBattleInput {
  eventId: string;
  challenger: Player;
  defender: Player;
  category: AttributeKey;
  judgeMode?: BattleJudgeMode;
  judgePlayerId?: string;
  /** Provide a specific challenge, else a random one is drawn for the category. */
  challenge?: BattleChallenge;
  /** Admin-created battles bypass cooldown / player-issue restrictions. */
  byAdmin?: boolean;
}

/** Issue a challenge → creates a `pending` battle. */
export async function createBattle(input: CreateBattleInput): Promise<Battle> {
  const { eventId, challenger, defender, category } = input;
  const event = await getEvent(eventId);
  if (!event) throw new Error('Event not found.');
  const bs = event.settings.battleSettings;

  if (challenger.id === defender.id) {
    throw new Error('You cannot challenge yourself.');
  }
  if (!defender.hasRolled) {
    throw new Error(`${defender.name} hasn't rolled a character sheet yet.`);
  }

  if (!input.byAdmin) {
    if (bs && !bs.allowPlayerIssuedChallenges) {
      throw new Error('Only the Game Master can start battles right now.');
    }
    const check = canPlayerChallenge(challenger);
    if (!check.ok) throw new Error(check.reason ?? 'You cannot challenge now.');
    const remaining = battleCooldownRemaining(
      challenger,
      bs?.cooldownMinutesBetweenBattles ?? 0,
    );
    if (remaining > 0) {
      throw new Error(
        `On cooldown — wait ${Math.ceil(remaining / 60_000)} min before challenging again.`,
      );
    }
  }

  const now = Date.now();
  const challenge = input.challenge ?? getRandomBattleChallenge(category);
  const data: Omit<Battle, 'id'> = {
    eventId,
    challengerId: challenger.id,
    defenderId: defender.id,
    challengerName: challenger.name,
    defenderName: defender.name,
    category,
    challenge,
    status: 'pending',
    judgeMode: input.judgeMode ?? 'admin',
    ...(input.judgePlayerId ? { judgePlayerId: input.judgePlayerId } : {}),
    createdAt: now,
  };
  const ref = await addDoc(battlesCol, data);

  // Player-issued challenges start the cooldown.
  if (!input.byAdmin) {
    await updateDoc(doc(db, COLLECTIONS.players, challenger.id), {
      lastBattleAt: now,
      updatedAt: now,
    });
  }

  await logActivity(
    eventId,
    'battle',
    `${challenger.name} challenged ${defender.name} to a Battle of ${STAT_LABELS[category]} — "${challenge.title}"! ⚔️`,
    challenger.id,
  );
  return { id: ref.id, ...data };
}

/** Defender accepts → `inProgress` (go do the party game). */
export async function acceptBattle(battleId: string): Promise<void> {
  const battle = await loadBattle(battleId);
  if (!battle) throw new Error('Battle not found.');
  await updateDoc(doc(db, COLLECTIONS.battles, battleId), {
    status: 'inProgress',
    acceptedAt: Date.now(),
  });
  await logActivity(
    battle.eventId,
    'battle',
    `${battle.defenderName} accepted ${battle.challengerName}'s challenge! The "${battle.challenge.title}" begins. 🥊`,
  );
}

/** Defender declines → `declined`. Blocked if cursed to accept / decline off. */
export async function declineBattle(battleId: string): Promise<void> {
  const battle = await loadBattle(battleId);
  if (!battle) throw new Error('Battle not found.');
  const event = await getEvent(battle.eventId);
  const bs = event?.settings.battleSettings;
  if (bs && !bs.allowDecline) {
    throw new Error('Declining challenges is disabled for this event.');
  }
  const defender = await loadPlayer(battle.defenderId);
  if (defender && !canPlayerDeclineChallenge(defender)) {
    throw new Error('The Curse of Dionysus forces you to accept this challenge!');
  }
  await updateDoc(doc(db, COLLECTIONS.battles, battleId), {
    status: 'declined',
    cancelledAt: Date.now(),
  });
  await logActivity(
    battle.eventId,
    'battle',
    `${battle.defenderName} declined ${battle.challengerName}'s challenge. 🐔`,
  );
}

// ---- Judging ----------------------------------------------------------------

/**
 * Record the real-world winner of the party game → `awaitingRolls`.
 * If both stat rolls are already in, the battle completes immediately.
 */
export async function recordRealWorldWinner(
  battleId: string,
  winnerId: string,
): Promise<void> {
  const battle = await loadBattle(battleId);
  if (!battle) throw new Error('Battle not found.');
  if (winnerId !== battle.challengerId && winnerId !== battle.defenderId) {
    throw new Error('Winner must be one of the two combatants.');
  }
  const loserId =
    winnerId === battle.challengerId ? battle.defenderId : battle.challengerId;
  await updateDoc(doc(db, COLLECTIONS.battles, battleId), {
    realWorldWinnerId: winnerId,
    realWorldLoserId: loserId,
    status: 'awaitingRolls',
  });
  const winnerName =
    winnerId === battle.challengerId ? battle.challengerName : battle.defenderName;
  await logActivity(
    battle.eventId,
    'battle',
    `${winnerName} won the real-world "${battle.challenge.title}"! Now for the stat rolls… 🎲`,
    winnerId,
  );

  if (battle.challengerRoll && battle.defenderRoll) {
    await completeBattle(battleId);
  }
}

// ---- Stat rolls -------------------------------------------------------------

/**
 * Submit a player's stat roll (d20 + attribute modifier + active modifiers).
 * Only once per player. Completes the battle once both rolls and the
 * real-world winner are in.
 */
export async function submitBattleRoll(
  battleId: string,
  playerId: string,
): Promise<void> {
  const battle = await loadBattle(battleId);
  if (!battle) throw new Error('Battle not found.');
  const isChallenger = playerId === battle.challengerId;
  const isDefender = playerId === battle.defenderId;
  if (!isChallenger && !isDefender) {
    throw new Error('Only the two combatants may roll.');
  }
  if (isChallenger && battle.challengerRoll) throw new Error('You already rolled.');
  if (isDefender && battle.defenderRoll) throw new Error('You already rolled.');

  const player = await loadPlayer(playerId);
  if (!player) throw new Error('Player not found.');

  const roll = calculateBattleRoll(player, battle.category);
  await updateDoc(doc(db, COLLECTIONS.battles, battleId), {
    [isChallenger ? 'challengerRoll' : 'defenderRoll']: roll,
  });

  // Re-read to see if both rolls + a recorded winner are now present.
  const updated = await loadBattle(battleId);
  if (
    updated?.challengerRoll &&
    updated.defenderRoll &&
    updated.realWorldWinnerId &&
    updated.status !== 'completed'
  ) {
    await completeBattle(battleId);
  }
}

// ---- Completion -------------------------------------------------------------

/**
 * Apply all rewards and finalise a battle. Idempotent-guarded: does nothing if
 * already completed or missing rolls / a real-world winner.
 */
export async function completeBattle(battleId: string): Promise<void> {
  const battle = await loadBattle(battleId);
  if (!battle) throw new Error('Battle not found.');
  if (battle.status === 'completed') return;
  if (!battle.challengerRoll || !battle.defenderRoll) {
    throw new Error('Both players must roll before completing.');
  }
  if (!battle.realWorldWinnerId) {
    throw new Error('Record the real-world winner before completing.');
  }
  const event = await getEvent(battle.eventId);
  if (!event) throw new Error('Event not found.');
  const bs = event.settings.battleSettings;
  const xpPerLevel = event.settings.xpPerLevel;

  // Stat-roll winner (ties favour the real-world victor).
  const statRollWinnerId =
    determineStatRollWinner(battle.challengerRoll, battle.defenderRoll) ??
    battle.realWorldWinnerId;
  const statRollLoserId =
    statRollWinnerId === battle.challengerId
      ? battle.defenderId
      : battle.challengerId;

  const gloryWinnerId = determineGloryWinner(
    battle.realWorldWinnerId,
    statRollWinnerId,
  );

  const realWorldWinnerName =
    battle.realWorldWinnerId === battle.challengerId
      ? battle.challengerName
      : battle.defenderName;

  // --- Victory / Glory XP to the real-world winner ---
  const victoryWinner = await loadPlayer(battle.realWorldWinnerId);
  const victoryAmount = gloryWinnerId ? bs.gloryXp : bs.victoryXp;
  if (victoryWinner) {
    await awardXp(
      victoryWinner,
      victoryAmount,
      xpPerLevel,
      gloryWinnerId
        ? `Glory in a Battle of ${STAT_LABELS[battle.category]}`
        : `won the Battle of ${STAT_LABELS[battle.category]}`,
    );
  }

  // --- Glory title ---
  if (gloryWinnerId) {
    const gloryPlayer =
      victoryWinner && victoryWinner.id === gloryWinnerId
        ? victoryWinner
        : await loadPlayer(gloryWinnerId);
    if (gloryPlayer && !(gloryPlayer.titles ?? []).includes('Glory-Seeker')) {
      await updateDoc(doc(db, COLLECTIONS.players, gloryPlayer.id), {
        titles: [...(gloryPlayer.titles ?? []), 'Glory-Seeker'],
        updatedAt: Date.now(),
      });
    }
  }

  // --- Stat-roll reward: Divine Favour, or a fallback XP bump ---
  let divineFavourRollId: string | undefined;
  let statRollXpAwarded: number | undefined;
  if (bs.triggerDivineFavourForStatWinner) {
    try {
      const outcome = await rollDivineFavour(battle.eventId, statRollWinnerId);
      divineFavourRollId = outcome.record.id;
    } catch (e) {
      console.error('[battle] divine favour roll failed', e);
    }
  } else {
    const statWinner = await loadPlayer(statRollWinnerId);
    if (statWinner) {
      await awardXp(
        statWinner,
        bs.statRollFallbackXp,
        xpPerLevel,
        `favoured by the gods (stat roll) in a Battle of ${STAT_LABELS[battle.category]}`,
      );
      statRollXpAwarded = bs.statRollFallbackXp;
    }
  }

  // --- Consume "until next battle" effects on both sides ---
  for (const pid of [battle.challengerId, battle.defenderId]) {
    const p = await loadPlayer(pid);
    if (!p) continue;
    const remaining = consumeBattleEffects(p);
    if (remaining.length !== (p.activeEffects ?? []).length) {
      await updateDoc(doc(db, COLLECTIONS.players, pid), {
        activeEffects: remaining,
        updatedAt: Date.now(),
      });
    }
  }

  // --- Save the battle ---
  const patch: Partial<Battle> = {
    status: 'completed',
    completedAt: Date.now(),
    statRollWinnerId,
    statRollLoserId,
    ...(gloryWinnerId ? { gloryWinnerId } : {}),
    ...(gloryWinnerId
      ? { gloryXpAwarded: victoryAmount }
      : { victoryXpAwarded: victoryAmount }),
    ...(statRollXpAwarded != null ? { statRollXpAwarded } : {}),
    ...(divineFavourRollId
      ? { divineFavourTriggeredForPlayerId: statRollWinnerId, divineFavourRollId }
      : {}),
  };
  await updateDoc(doc(db, COLLECTIONS.battles, battleId), patch);

  // --- Activity log ---
  await logActivity(
    battle.eventId,
    'battle',
    `${realWorldWinnerName} won the Battle of ${STAT_LABELS[battle.category]} (+${victoryAmount} XP)! 🏆`,
    battle.realWorldWinnerId,
  );
  if (gloryWinnerId) {
    const gloryName =
      gloryWinnerId === battle.challengerId
        ? battle.challengerName
        : battle.defenderName;
    await logActivity(
      battle.eventId,
      'battle',
      `${gloryName} achieved Glory in a Battle of ${STAT_LABELS[battle.category]}! 👑⚔️`,
      gloryWinnerId,
    );
  }
}

// ---- Cancel / admin ---------------------------------------------------------

export async function cancelBattle(battleId: string): Promise<void> {
  const battle = await loadBattle(battleId);
  if (!battle) return;
  await updateDoc(doc(db, COLLECTIONS.battles, battleId), {
    status: 'cancelled',
    cancelledAt: Date.now(),
  });
  await logActivity(
    battle.eventId,
    'battle',
    `Battle between ${battle.challengerName} and ${battle.defenderName} was cancelled.`,
  );
}

export async function deleteBattle(battleId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.battles, battleId));
}

/** Admin: roll both players' stat rolls at once (when players can't be bothered). */
export async function adminForceRolls(battleId: string): Promise<void> {
  const battle = await loadBattle(battleId);
  if (!battle) throw new Error('Battle not found.');
  if (!battle.challengerRoll) await submitBattleRoll(battleId, battle.challengerId);
  if (!battle.defenderRoll) await submitBattleRoll(battleId, battle.defenderId);
}

/** Admin: trigger a Divine Favour roll for a player and tag it on the battle. */
export async function adminTriggerDivineFavour(
  battleId: string,
  playerId: string,
): Promise<void> {
  const battle = await loadBattle(battleId);
  if (!battle) throw new Error('Battle not found.');
  const outcome = await rollDivineFavour(battle.eventId, playerId);
  await updateDoc(doc(db, COLLECTIONS.battles, battleId), {
    divineFavourTriggeredForPlayerId: playerId,
    divineFavourRollId: outcome.record.id,
  });
}

// ---- Subscriptions ----------------------------------------------------------

/**
 * All battles for an event, most recent first (history + admin). Sorted/capped
 * in memory so no composite index is required.
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
      const battles = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Battle);
      battles.sort((a, b) => b.createdAt - a.createdAt);
      cb(battles.slice(0, max));
    },
    (err) => console.error('[battles] subscription error', err),
  );
}

/** Real-time subscription to a single battle document. */
export function subscribeBattle(
  battleId: string,
  cb: (battle: Battle | null) => void,
): () => void {
  return onSnapshot(doc(db, COLLECTIONS.battles, battleId), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Battle) : null);
  });
}
