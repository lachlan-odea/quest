/**
 * Quest service — create, assign, submit proof, and mark complete/failed.
 *
 * Completing a quest awards XP to the assigned player. In the MVP this is an
 * admin action (admins "mark quests complete"); players submit proof notes.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Player, Quest, QuestDifficulty, StatKey } from '@/types';
import { awardXp } from './playerService';
import { logActivity } from './activityService';

const questsCol = collection(db, COLLECTIONS.quests);

export interface CreateQuestInput {
  eventId: string;
  title: string;
  description: string;
  difficulty: QuestDifficulty;
  xpReward: number;
  recommendedAttribute?: StatKey | null;
  hiddenFromOthers?: boolean;
  assignedPlayerId?: string | null;
  assignedTeamId?: string | null;
}

export async function createQuest(input: CreateQuestInput): Promise<Quest> {
  const now = Date.now();
  const assignedPlayerId = input.assignedPlayerId ?? null;
  const data: Omit<Quest, 'id'> = {
    eventId: input.eventId,
    title: input.title.trim(),
    description: input.description.trim(),
    difficulty: input.difficulty,
    xpReward: input.xpReward,
    hiddenFromOthers: input.hiddenFromOthers ?? true,
    assignedPlayerId,
    assignedTeamId: input.assignedTeamId ?? null,
    status: assignedPlayerId ? 'assigned' : 'unassigned',
    createdAt: now,
    updatedAt: now,
    // Firestore rejects `undefined`, so only include the field when set.
    ...(input.recommendedAttribute
      ? { recommendedAttribute: input.recommendedAttribute }
      : {}),
  };
  const ref = await addDoc(questsCol, data);
  if (assignedPlayerId) {
    await updateDoc(doc(db, COLLECTIONS.players, assignedPlayerId), {
      assignedQuestIds: arrayUnion(ref.id),
    });
  }
  return { id: ref.id, ...data };
}

/** Admin view — every quest in the event. */
export function subscribeQuests(
  eventId: string,
  cb: (quests: Quest[]) => void,
): () => void {
  const q = query(questsCol, where('eventId', '==', eventId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Quest));
  });
}

/**
 * Player view — only the quests assigned to this player. (Security rules also
 * prevent reading other players' hidden quests.)
 */
export function subscribePlayerQuests(
  _eventId: string,
  playerId: string,
  cb: (quests: Quest[]) => void,
): () => void {
  // Query by assignedPlayerId only (single-field, auto-indexed). A player id
  // is unique to one event, so this needs no composite index.
  const q = query(questsCol, where('assignedPlayerId', '==', playerId));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Quest));
    },
    (err) => console.error('[quests] subscription error', err),
  );
}

export async function assignQuest(
  quest: Quest,
  playerId: string,
): Promise<void> {
  // Detach from a previous assignee if needed.
  if (quest.assignedPlayerId && quest.assignedPlayerId !== playerId) {
    await updateDoc(doc(db, COLLECTIONS.players, quest.assignedPlayerId), {
      assignedQuestIds: arrayRemove(quest.id),
    });
  }
  await updateDoc(doc(db, COLLECTIONS.quests, quest.id), {
    assignedPlayerId: playerId,
    status: 'assigned',
    updatedAt: Date.now(),
  });
  await updateDoc(doc(db, COLLECTIONS.players, playerId), {
    assignedQuestIds: arrayUnion(quest.id),
  });
}

/** Player submits proof / a note for a quest (does not complete it). */
export async function submitProof(
  questId: string,
  proofNote: string,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.quests, questId), {
    proofNote,
    updatedAt: Date.now(),
  });
}

/**
 * Mark a quest complete and award its XP to the assigned player.
 * `multiplier` lets bonus-XP perks (e.g. "Crowd Favourite") boost the reward.
 */
export async function completeQuest(
  quest: Quest,
  player: Player | null,
  xpPerLevel: number,
  multiplier = 1,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.quests, quest.id), {
    status: 'completed',
    completedAt: Date.now(),
    updatedAt: Date.now(),
  });

  if (player) {
    await awardXp(
      player,
      quest.xpReward * multiplier,
      xpPerLevel,
      `completed "${quest.title}"`,
    );
    await updateDoc(doc(db, COLLECTIONS.players, player.id), {
      completedQuestIds: arrayUnion(quest.id),
      assignedQuestIds: arrayRemove(quest.id),
    });
  }
  await logActivity(
    quest.eventId,
    'quest',
    `Quest complete: "${quest.title}" ✅`,
    player?.id,
  );
}

export async function failQuest(quest: Quest): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.quests, quest.id), {
    status: 'failed',
    updatedAt: Date.now(),
  });
  if (quest.assignedPlayerId) {
    await updateDoc(doc(db, COLLECTIONS.players, quest.assignedPlayerId), {
      assignedQuestIds: arrayRemove(quest.id),
    });
  }
  await logActivity(quest.eventId, 'quest', `Quest failed: "${quest.title}" ❌`);
}

export async function deleteQuest(quest: Quest): Promise<void> {
  if (quest.assignedPlayerId) {
    await updateDoc(doc(db, COLLECTIONS.players, quest.assignedPlayerId), {
      assignedQuestIds: arrayRemove(quest.id),
    });
  }
  await deleteDoc(doc(db, COLLECTIONS.quests, quest.id));
}
