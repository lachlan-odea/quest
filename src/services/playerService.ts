/**
 * Player service — character creation, stat rolling, XP, buffs/debuffs and
 * subscriptions.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Player, StatBlock, StatusEffect } from '@/types';
import { levelFromXp } from '@/lib/utils';
import { logActivity } from './activityService';

const playersCol = collection(db, COLLECTIONS.players);

const ZERO_STATS: StatBlock = {
  strength: 0,
  charisma: 0,
  constitution: 0,
  wisdom: 0,
  dexterity: 0,
  luck: 0,
};

export interface CreatePlayerInput {
  eventId: string;
  authUid: string;
  name: string;
  className: string;
}

export async function createPlayer(input: CreatePlayerInput): Promise<Player> {
  const now = Date.now();
  const data: Omit<Player, 'id'> = {
    eventId: input.eventId,
    authUid: input.authUid,
    name: input.name.trim(),
    className: input.className,
    teamId: null,
    level: 1,
    xp: 0,
    spentXp: 0,
    stats: { ...ZERO_STATS },
    hasRolled: false,
    inventory: [],
    activeBuffs: [],
    activeDebuffs: [],
    assignedQuestIds: [],
    completedQuestIds: [],
    upgradeIds: [],
    lastBattleAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(playersCol, data);
  await logActivity(
    input.eventId,
    'player',
    `${data.name} joined as ${data.className}!`,
    ref.id,
  );
  return { id: ref.id, ...data };
}

/** Find this auth user's existing player in an event, if any. */
export async function getPlayerForAuth(
  eventId: string,
  authUid: string,
): Promise<Player | null> {
  const q = query(
    playersCol,
    where('eventId', '==', eventId),
    where('authUid', '==', authUid),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Player;
}

export function subscribePlayer(
  playerId: string,
  cb: (player: Player | null) => void,
): () => void {
  return onSnapshot(doc(db, COLLECTIONS.players, playerId), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Player) : null);
  });
}

/** Subscribe to this auth user's player doc within an event (real-time). */
export function subscribePlayerForAuth(
  eventId: string,
  authUid: string,
  cb: (player: Player | null) => void,
): () => void {
  const q = query(
    playersCol,
    where('eventId', '==', eventId),
    where('authUid', '==', authUid),
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) return cb(null);
    const d = snap.docs[0];
    cb({ id: d.id, ...d.data() } as Player);
  });
}

/**
 * All players in an event, ordered by XP (leaderboard / admin).
 * We filter by eventId in Firestore (auto-indexed) and sort in memory so no
 * composite index is required.
 */
export function subscribePlayers(
  eventId: string,
  cb: (players: Player[]) => void,
): () => void {
  const q = query(playersCol, where('eventId', '==', eventId));
  return onSnapshot(
    q,
    (snap) => {
      const players = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Player,
      );
      players.sort((a, b) => b.xp - a.xp);
      cb(players);
    },
    (err) => console.error('[players] subscription error', err),
  );
}

export async function rollStats(
  player: Player,
  stats: StatBlock,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.players, player.id), {
    stats,
    hasRolled: true,
    updatedAt: Date.now(),
  });
  await logActivity(
    player.eventId,
    'player',
    `${player.name} rolled their character sheet. 🎲`,
    player.id,
  );
}

export async function updatePlayer(
  playerId: string,
  patch: Partial<Player>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.players, playerId), {
    ...patch,
    updatedAt: Date.now(),
  });
}

/**
 * Award (or remove, with a negative amount) XP and recompute the player's
 * level. `xpPerLevel` comes from the event settings.
 */
export async function awardXp(
  player: Player,
  amount: number,
  xpPerLevel: number,
  reason: string,
): Promise<void> {
  const newXp = Math.max(0, player.xp + amount);
  const newLevel = levelFromXp(newXp, xpPerLevel);
  await updateDoc(doc(db, COLLECTIONS.players, player.id), {
    xp: newXp,
    level: newLevel,
    updatedAt: Date.now(),
  });
  const verb = amount >= 0 ? `earned ${amount}` : `lost ${Math.abs(amount)}`;
  await logActivity(
    player.eventId,
    'xp',
    `${player.name} ${verb} XP — ${reason}.`,
    player.id,
  );
  if (newLevel > player.level) {
    await logActivity(
      player.eventId,
      'xp',
      `${player.name} reached level ${newLevel}! ✨`,
      player.id,
    );
  }
}

/** Apply a temporary debuff (e.g. after losing a battle). */
export async function addDebuff(
  player: Player,
  debuff: StatusEffect,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.players, player.id), {
    activeDebuffs: [...player.activeDebuffs, debuff],
    updatedAt: Date.now(),
  });
  await logActivity(
    player.eventId,
    'player',
    `${player.name} is afflicted with "${debuff.label}".`,
    player.id,
  );
}

export async function removeDebuff(
  player: Player,
  debuffId: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.players, player.id), {
    activeDebuffs: player.activeDebuffs.filter((d) => d.id !== debuffId),
    updatedAt: Date.now(),
  });
}

export async function setTeam(
  playerId: string,
  teamId: string | null,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.players, playerId), {
    teamId,
    updatedAt: Date.now(),
  });
}

export async function deletePlayer(playerId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.players, playerId));
}
