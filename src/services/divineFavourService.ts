/**
 * Divine Favour service — roll on the Table of Divine Favour, apply the
 * resulting game effects to a player, and manage their active effects.
 *
 * Design notes (MVP, intentionally not a full rules engine):
 *  - Timestamps are epoch ms (matching the rest of the app), not Firestore
 *    Timestamps.
 *  - Rolls are stored in a top-level `divineFavourRolls` collection keyed by
 *    `eventId` + `playerId` (same pattern as every other collection here), not
 *    a subcollection — this keeps queries index-free and the rules simple.
 *  - Effect application happens client-side for a fast, offline-tolerant party
 *    game. This is trust-based (like XP/battles already are). The functions are
 *    structured so the whole apply step can move to a Cloud Function later
 *    without changing callers. See README "Hardening".
 *
 * Effect handling:
 *  - Instant effects (XP, titles, debuff removal, immunity, team XP, free
 *    upgrade token) are applied immediately to the player document.
 *  - Ongoing / behavioural effects (attribute & roll modifiers, restrictions,
 *    social punishments, auto-win, quest XP bonus) become an `ActiveEffect`
 *    record on the player. The battle/player services enforce the ones that
 *    can be enforced; the rest are surfaced in the UI as roleplay rules.
 */

import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type {
  ActiveEffect,
  DivineFavourResult,
  DivineFavourRoll,
  GameEffect,
  GameEvent,
  Player,
} from '@/types';
import { rollDie } from '@/lib/dice';
import {
  GROOMS_BLESSING,
  divineFavourResultFor,
} from '@/lib/divineFavour';
import { levelFromXp, shortId } from '@/lib/utils';
import { getEvent } from './eventService';
import { logActivity } from './activityService';

const rollsCol = collection(db, COLLECTIONS.divineFavourRolls);

/** Sentinel "rest of the night" timestamp (max safe date). */
export const END_OF_NIGHT = 8640000000000000;

// -----------------------------------------------------------------------------
// Small helpers
// -----------------------------------------------------------------------------

export function activeEffectsOf(player: Player): ActiveEffect[] {
  return player.activeEffects ?? [];
}

export function isDebuffImmune(player: Player, now = Date.now()): boolean {
  return !!player.debuffImmuneUntil && player.debuffImmuneUntil > now;
}

interface ApplyOutcome {
  patch: Partial<Player>;
  teamXpDelta: number;
  /** Activity log lines to emit (caller writes them). */
  activities: string[];
}

interface EffectMeta {
  source: string;
  name: string;
  description?: string;
}

/**
 * Pure-ish reducer: given a player and a list of (already choice-resolved)
 * effects, compute the document patch + any team XP delta. Does NOT write.
 */
function reduceEffects(
  player: Player,
  effects: GameEffect[],
  meta: EffectMeta,
  xpPerLevel: number,
  now: number,
): ApplyOutcome {
  let xp = player.xp;
  const titles = [...(player.titles ?? [])];
  let activeDebuffs = [...player.activeDebuffs];
  const inventory = [...player.inventory];
  const activeEffects = [...(player.activeEffects ?? [])];
  let debuffImmuneUntil = player.debuffImmuneUntil;
  let teamXpDelta = 0;
  const activities: string[] = [];
  const ongoing: GameEffect[] = [];

  for (const e of effects) {
    switch (e.type) {
      case 'xpGain':
        xp += e.value ?? 0;
        break;
      case 'xpLoss':
        xp = Math.max(0, xp - (e.value ?? 0));
        break;
      case 'titleGrant':
        if (e.title && !titles.includes(e.title)) {
          titles.push(e.title);
          activities.push(`${player.name} earned the title "${e.title}". 🏷️`);
        }
        break;
      case 'removeDebuff':
        if (activeDebuffs.length > 0) activeDebuffs = activeDebuffs.slice(1);
        break;
      case 'removeAllDebuffs':
        activeDebuffs = [];
        break;
      case 'debuffImmunity':
        debuffImmuneUntil =
          e.until === 'endOfNight'
            ? END_OF_NIGHT
            : now + (e.durationMinutes ?? 0) * 60_000;
        break;
      case 'teamXpGain':
        teamXpDelta += e.value ?? 0;
        break;
      case 'freeUpgrade':
        inventory.push({
          id: shortId('item'),
          name: '🎟️ Free Upgrade Token',
          description: 'Redeem with your Game Master for one free upgrade.',
        });
        break;
      case 'debuff':
        activeDebuffs.push({
          id: shortId('debuff'),
          label: e.title ?? meta.name,
          description: e.description ?? '',
        });
        break;
      default:
        ongoing.push(e);
    }
  }

  // Bundle ongoing/behavioural effects into a single ActiveEffect record.
  if (ongoing.length > 0) {
    const maxDuration = ongoing.reduce(
      (m, o) => Math.max(m, o.durationMinutes ?? 0),
      0,
    );
    const effect: ActiveEffect = {
      id: shortId('fx'),
      source: meta.source,
      name: meta.name,
      description:
        meta.description ??
        (ongoing
          .map((o) => o.description)
          .filter(Boolean)
          .join(' ') ||
          meta.name),
      effects: ongoing,
      createdAt: now,
      ...(maxDuration > 0 ? { expiresAt: now + maxDuration * 60_000 } : {}),
    };
    activeEffects.push(effect);
  }

  // Assemble the patch with only the fields that actually changed.
  const patch: Partial<Player> = { updatedAt: now };
  if (xp !== player.xp) {
    patch.xp = xp;
    patch.level = levelFromXp(xp, xpPerLevel);
  }
  if (titles.length !== (player.titles ?? []).length) patch.titles = titles;
  if (activeDebuffs.length !== player.activeDebuffs.length)
    patch.activeDebuffs = activeDebuffs;
  if (inventory.length !== player.inventory.length) patch.inventory = inventory;
  if (activeEffects.length !== (player.activeEffects ?? []).length)
    patch.activeEffects = activeEffects;
  if (debuffImmuneUntil !== player.debuffImmuneUntil)
    patch.debuffImmuneUntil = debuffImmuneUntil;

  return { patch, teamXpDelta, activities };
}

/** Add XP to the player's team's cached total (best-effort). */
async function bumpTeamXp(player: Player, delta: number): Promise<void> {
  if (!delta || !player.teamId) return;
  const ref = doc(db, COLLECTIONS.teams, player.teamId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = (snap.data().xp as number) ?? 0;
  await updateDoc(ref, { xp: Math.max(0, current + delta) });
}

/** Load a player document. */
async function loadPlayer(playerId: string): Promise<Player | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.players, playerId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Player) : null;
}

/**
 * Apply a resolved set of effects to a player and persist. Returns the effects
 * that were actually applied (empty if skipped due to debuff immunity).
 */
async function applyResolvedEffects(
  event: GameEvent,
  player: Player,
  effects: GameEffect[],
  meta: EffectMeta,
  opts: { isPunishment?: boolean; extraPatch?: Partial<Player> } = {},
): Promise<GameEffect[]> {
  const now = Date.now();

  // Debuff immunity shrugs off entire punishments.
  if (opts.isPunishment && isDebuffImmune(player, now)) {
    await updateDoc(doc(db, COLLECTIONS.players, player.id), {
      ...(opts.extraPatch ?? {}),
      updatedAt: now,
    });
    await logActivity(
      event.id,
      'player',
      `${player.name} shrugged off "${meta.name}" — debuff immunity! 🛡️`,
      player.id,
    );
    return [];
  }

  const { patch, teamXpDelta, activities } = reduceEffects(
    player,
    effects,
    meta,
    event.settings.xpPerLevel,
    now,
  );

  await updateDoc(doc(db, COLLECTIONS.players, player.id), {
    ...patch,
    ...(opts.extraPatch ?? {}),
  });
  await bumpTeamXp(player, teamXpDelta);
  for (const line of activities) {
    await logActivity(event.id, 'player', line, player.id);
  }
  return effects;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export interface RollOutcome {
  record: DivineFavourRoll;
  result: DivineFavourResult;
  /** True when a choice is now pending (Divine Intervention). */
  awaitingChoice: boolean;
}

/**
 * Roll on the Table of Divine Favour for a player. Handles the legendary
 * double-20 "Groom's Blessing", and defers application for choice results
 * (Divine Intervention) by stashing a `pendingDivineChoice` on the player.
 */
export async function rollDivineFavour(
  eventId: string,
  playerId: string,
): Promise<RollOutcome> {
  const [event, player] = await Promise.all([getEvent(eventId), loadPlayer(playerId)]);
  if (!event) throw new Error('Event not found.');
  if (!player) throw new Error('Player not found.');

  const now = Date.now();
  const roll = rollDie(20);
  const secondRoll = roll === 20 ? rollDie(20) : undefined;
  const triggeredGroomsBlessing = roll === 20 && secondRoll === 20;
  const result = triggeredGroomsBlessing
    ? GROOMS_BLESSING
    : divineFavourResultFor(roll);

  // Persist the roll first so we have an id to reference everywhere.
  const rollData = {
    eventId,
    playerId,
    roll,
    ...(secondRoll != null ? { secondRoll } : {}),
    resultName: result.name,
    resultDescription: result.description,
    triggeredGroomsBlessing,
    effectsApplied: [] as GameEffect[],
    createdAt: now,
  };
  const ref = await addDoc(rollsCol, rollData);
  const record: DivineFavourRoll = { id: ref.id, ...rollData };

  // Track the roll on the player.
  const rollIds = [...(player.divineFavourRollIds ?? []), ref.id];

  await logActivity(
    eventId,
    'player',
    `${player.name} rolled ${roll}${secondRoll != null ? ` then ${secondRoll}` : ''} on the Table of Divine Favour — ${result.name}! 🎲`,
    playerId,
  );

  // 1) Legendary double-20.
  if (triggeredGroomsBlessing) {
    const applied = await applyResolvedEffects(
      event,
      player,
      result.effects,
      { source: "The Groom's Blessing", name: result.name },
      { extraPatch: { divineFavourRollIds: rollIds } },
    );
    await updateDoc(ref, { effectsApplied: applied });
    await logActivity(
      eventId,
      'xp',
      `👑✨ THE GROOM'S BLESSING! ${player.name} rolled double 20 — 500 XP, a legendary title, debuff immunity for the night, and +100 team XP! ✨👑`,
      playerId,
    );
    return { record: { ...record, effectsApplied: applied }, result, awaitingChoice: false };
  }

  // 2) Choice result (Divine Intervention) — defer until the player picks.
  if (result.choices && result.choices.length > 0) {
    await updateDoc(doc(db, COLLECTIONS.players, playerId), {
      divineFavourRollIds: rollIds,
      pendingDivineChoice: record,
      updatedAt: now,
    });
    return { record, result, awaitingChoice: true };
  }

  // 3) Normal result — apply immediately.
  const applied = await applyResolvedEffects(
    event,
    player,
    result.effects,
    { source: 'Divine Favour', name: result.name },
    {
      isPunishment: result.tier === 'punishment',
      extraPatch: { divineFavourRollIds: rollIds },
    },
  );
  await updateDoc(ref, { effectsApplied: applied });
  return { record: { ...record, effectsApplied: applied }, result, awaitingChoice: false };
}

/**
 * Resolve a pending Divine Intervention choice for a player.
 */
export async function resolveDivineChoice(
  eventId: string,
  playerId: string,
  choiceId: string,
): Promise<void> {
  const [event, player] = await Promise.all([getEvent(eventId), loadPlayer(playerId)]);
  if (!event || !player) throw new Error('Event or player not found.');
  const pending = player.pendingDivineChoice;
  if (!pending) throw new Error('No pending choice.');

  const result = divineFavourResultFor(pending.roll);
  const choice = result.choices?.find((c) => c.id === choiceId);
  if (!choice) throw new Error('Invalid choice.');

  const applied = await applyResolvedEffects(
    event,
    player,
    choice.effects,
    { source: 'Divine Intervention', name: `${result.name}: ${choice.label}` },
    { extraPatch: { pendingDivineChoice: deleteField() as unknown as undefined } },
  );
  await updateDoc(doc(db, COLLECTIONS.divineFavourRolls, pending.id), {
    selectedChoice: choiceId,
    effectsApplied: applied,
  });
  await logActivity(
    eventId,
    'player',
    `${player.name} chose "${choice.label}" from Divine Intervention.`,
    playerId,
  );
}

/** Apply an arbitrary game effect (admin tool / future integrations). */
export async function applyGameEffect(
  eventId: string,
  playerId: string,
  effect: GameEffect,
): Promise<void> {
  const [event, player] = await Promise.all([getEvent(eventId), loadPlayer(playerId)]);
  if (!event || !player) throw new Error('Event or player not found.');
  await applyResolvedEffects(event, player, [effect], {
    source: 'Admin',
    name: effect.description ?? effect.type,
  });
}

/** Convenience wrapper — apply a full result's effects to a player. */
export async function applyDivineFavourResult(
  eventId: string,
  playerId: string,
  result: DivineFavourResult,
  selectedChoice?: string,
): Promise<void> {
  const [event, player] = await Promise.all([getEvent(eventId), loadPlayer(playerId)]);
  if (!event || !player) throw new Error('Event or player not found.');
  const effects =
    result.choices && selectedChoice
      ? result.choices.find((c) => c.id === selectedChoice)?.effects ?? []
      : result.effects;
  await applyResolvedEffects(
    event,
    player,
    effects,
    { source: 'Divine Favour', name: result.name },
    { isPunishment: result.tier === 'punishment' },
  );
}

/** Grant the legendary Groom's Blessing directly (admin reward). */
export async function triggerGroomsBlessing(
  eventId: string,
  playerId: string,
): Promise<void> {
  const [event, player] = await Promise.all([getEvent(eventId), loadPlayer(playerId)]);
  if (!event || !player) throw new Error('Event or player not found.');
  await applyResolvedEffects(event, player, GROOMS_BLESSING.effects, {
    source: "The Groom's Blessing",
    name: GROOMS_BLESSING.name,
  });
  await logActivity(
    eventId,
    'xp',
    `👑✨ ${player.name} received THE GROOM'S BLESSING! ✨👑`,
    playerId,
  );
}

/** Remove a single active effect from a player. */
export async function clearActiveEffect(
  _eventId: string,
  playerId: string,
  effectId: string,
): Promise<void> {
  const player = await loadPlayer(playerId);
  if (!player) return;
  await updateDoc(doc(db, COLLECTIONS.players, playerId), {
    activeEffects: activeEffectsOf(player).filter((e) => e.id !== effectId),
    updatedAt: Date.now(),
  });
}

/** Clear ALL active effects, debuffs and debuff immunity for a player. */
export async function clearAllEffects(
  _eventId: string,
  playerId: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.players, playerId), {
    activeEffects: [],
    activeDebuffs: [],
    debuffImmuneUntil: deleteField(),
    updatedAt: Date.now(),
  });
}

/** One-shot read of a player's active effects. */
export async function getActiveEffects(
  _eventId: string,
  playerId: string,
): Promise<ActiveEffect[]> {
  const player = await loadPlayer(playerId);
  return player ? activeEffectsOf(player) : [];
}

/**
 * Subscribe to Divine Favour roll history for an event (optionally filtered to
 * one player). Sorted newest-first in memory so no composite index is needed.
 */
export function getDivineFavourHistory(
  eventId: string,
  playerId: string | null,
  cb: (rolls: DivineFavourRoll[]) => void,
  max = 100,
): () => void {
  const q = query(rollsCol, where('eventId', '==', eventId));
  return onSnapshot(
    q,
    (snap) => {
      let rolls = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DivineFavourRoll);
      if (playerId) rolls = rolls.filter((r) => r.playerId === playerId);
      rolls.sort((a, b) => b.createdAt - a.createdAt);
      cb(rolls.slice(0, max));
    },
    (err) => console.error('[divineFavour] subscription error', err),
  );
}

/** One-shot read of Divine Favour roll history (e.g. for the demo seed). */
export async function fetchDivineFavourHistory(
  eventId: string,
  playerId?: string,
): Promise<DivineFavourRoll[]> {
  const snap = await getDocs(query(rollsCol, where('eventId', '==', eventId)));
  let rolls = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DivineFavourRoll);
  if (playerId) rolls = rolls.filter((r) => r.playerId === playerId);
  return rolls.sort((a, b) => b.createdAt - a.createdAt);
}
