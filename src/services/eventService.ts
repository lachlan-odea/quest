/**
 * Event service — create/join/manage the top-level game event, plus seeding
 * and a full game reset.
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { GameEvent, EventStatus, EventSettings } from '@/types';
import {
  DEFAULT_EVENT_SETTINGS,
  generateJoinCode,
} from '@/lib/utils';
import {
  QUEST_TEMPLATES,
  UPGRADE_TEMPLATES,
  TEAM_TEMPLATES,
} from '@/lib/seedData';
import { logActivity } from './activityService';

const eventsCol = collection(db, COLLECTIONS.events);

export interface CreateEventInput {
  name: string;
  adminPin: string;
  adminUid: string;
  settings?: Partial<EventSettings>;
}

/** Create a new event with the creator as the sole admin. */
export async function createEvent(input: CreateEventInput): Promise<GameEvent> {
  const now = Date.now();
  const data: Omit<GameEvent, 'id'> = {
    name: input.name.trim() || 'The Big Night',
    joinCode: generateJoinCode(),
    adminPin: input.adminPin,
    adminUids: [input.adminUid],
    status: 'setup',
    settings: { ...DEFAULT_EVENT_SETTINGS, ...input.settings },
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(eventsCol, data);
  await logActivity(ref.id, 'event', `Event "${data.name}" created. 🍻`);
  return { id: ref.id, ...data };
}

export async function getEvent(eventId: string): Promise<GameEvent | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.events, eventId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as GameEvent) : null;
}

/** Look up an event by its join code (case-insensitive). */
export async function getEventByJoinCode(
  joinCode: string,
): Promise<GameEvent | null> {
  const code = joinCode.trim().toUpperCase();
  const q = query(eventsCol, where('joinCode', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as GameEvent;
}

/** Real-time subscription to a single event document. */
export function subscribeEvent(
  eventId: string,
  cb: (event: GameEvent | null) => void,
): () => void {
  return onSnapshot(doc(db, COLLECTIONS.events, eventId), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as GameEvent) : null);
  });
}

export async function setEventStatus(
  eventId: string,
  status: EventStatus,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.events, eventId), {
    status,
    updatedAt: Date.now(),
  });
  await logActivity(eventId, 'event', `The game is now ${status}.`);
}

export async function updateEventSettings(
  eventId: string,
  settings: EventSettings,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.events, eventId), {
    settings,
    updatedAt: Date.now(),
  });
}

export async function regenerateJoinCode(eventId: string): Promise<string> {
  const code = generateJoinCode();
  await updateDoc(doc(db, COLLECTIONS.events, eventId), {
    joinCode: code,
    updatedAt: Date.now(),
  });
  return code;
}

/**
 * Admin elevation: verify the PIN client-side, then append this uid to the
 * event's adminUids. (See firestore.rules + README for the security caveats.)
 */
export async function elevateToAdmin(
  eventId: string,
  pin: string,
  uid: string,
): Promise<boolean> {
  const event = await getEvent(eventId);
  if (!event || event.adminPin !== pin) return false;
  if (!event.adminUids.includes(uid)) {
    await updateDoc(doc(db, COLLECTIONS.events, eventId), {
      adminUids: [...event.adminUids, uid],
      updatedAt: Date.now(),
    });
  }
  return true;
}

export function isAdmin(event: GameEvent | null, uid: string | null): boolean {
  return !!event && !!uid && event.adminUids.includes(uid);
}

/**
 * Seed an event with the default quests, upgrades and teams. Idempotent-ish:
 * pass `force` to seed even if data already exists (creates duplicates).
 */
export async function seedEvent(eventId: string): Promise<void> {
  const batch = writeBatch(db);

  TEAM_TEMPLATES.forEach((t) => {
    const ref = doc(collection(db, COLLECTIONS.teams));
    batch.set(ref, {
      eventId,
      name: t.name,
      color: t.color,
      playerIds: [],
      xp: 0,
      createdAt: Date.now(),
    });
  });

  UPGRADE_TEMPLATES.forEach((u) => {
    const ref = doc(collection(db, COLLECTIONS.upgrades));
    batch.set(ref, { eventId, ...u });
  });

  QUEST_TEMPLATES.forEach((qt) => {
    const ref = doc(collection(db, COLLECTIONS.quests));
    batch.set(ref, {
      eventId,
      assignedPlayerId: null,
      assignedTeamId: null,
      title: qt.title,
      description: qt.description,
      difficulty: qt.difficulty,
      recommendedAttribute: qt.recommendedAttribute ?? null,
      xpReward: DEFAULT_EVENT_SETTINGS.questXp[qt.difficulty],
      status: 'unassigned',
      hiddenFromOthers: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  await batch.commit();
  await logActivity(eventId, 'event', 'Quests, upgrades and teams seeded. ⚔️');
}

/**
 * Reset the game: deletes all players, teams, quests, battles, upgrades and
 * activity for the event, and returns the event to "setup" status. The event
 * doc itself (and its join code / admins) is kept.
 */
export async function resetGame(eventId: string): Promise<void> {
  const collectionsToWipe = [
    COLLECTIONS.players,
    COLLECTIONS.teams,
    COLLECTIONS.quests,
    COLLECTIONS.battles,
    COLLECTIONS.upgrades,
    COLLECTIONS.activityLog,
    COLLECTIONS.divineFavourRolls,
  ];

  for (const name of collectionsToWipe) {
    const snap = await getDocs(
      query(collection(db, name), where('eventId', '==', eventId)),
    );
    // Firestore batches are capped at 500 ops; chunk to be safe.
    for (let i = 0; i < snap.docs.length; i += 450) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }

  await updateDoc(doc(db, COLLECTIONS.events, eventId), {
    status: 'setup',
    updatedAt: Date.now(),
  });
  await logActivity(eventId, 'event', 'The game was reset. A new legend begins.');
}
