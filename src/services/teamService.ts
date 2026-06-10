/**
 * Team service — create/manage teams, randomise membership, and keep cached
 * team XP in sync.
 */

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Player, Team } from '@/types';
import { shuffle } from '@/lib/utils';
import { logActivity } from './activityService';

const teamsCol = collection(db, COLLECTIONS.teams);

export function subscribeTeams(
  eventId: string,
  cb: (teams: Team[]) => void,
): () => void {
  const q = query(teamsCol, where('eventId', '==', eventId));
  return onSnapshot(
    q,
    (snap) => {
      const teams = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
      teams.sort((a, b) => b.xp - a.xp);
      cb(teams);
    },
    (err) => console.error('[teams] subscription error', err),
  );
}

export async function createTeam(
  eventId: string,
  name: string,
  color: string,
): Promise<Team> {
  const data: Omit<Team, 'id'> = {
    eventId,
    name: name.trim(),
    color,
    playerIds: [],
    xp: 0,
    createdAt: Date.now(),
  };
  const ref = await addDoc(teamsCol, data);
  return { id: ref.id, ...data };
}

export async function updateTeam(
  teamId: string,
  patch: Partial<Pick<Team, 'name' | 'color' | 'playerIds'>>,
): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.teams, teamId), patch);
}

export async function deleteTeam(team: Team): Promise<void> {
  const batch = writeBatch(db);
  // Unassign any members.
  team.playerIds.forEach((pid) => {
    batch.update(doc(db, COLLECTIONS.players, pid), { teamId: null });
  });
  batch.delete(doc(db, COLLECTIONS.teams, team.id));
  await batch.commit();
}

/**
 * Randomly distribute the given players across the given teams as evenly as
 * possible. Overwrites existing team membership.
 */
export async function randomiseTeams(
  eventId: string,
  players: Player[],
  teams: Team[],
): Promise<void> {
  if (teams.length === 0) throw new Error('Create at least one team first.');

  const shuffled = shuffle(players);
  const buckets: Record<string, string[]> = {};
  teams.forEach((t) => (buckets[t.id] = []));

  shuffled.forEach((p, i) => {
    const team = teams[i % teams.length];
    buckets[team.id].push(p.id);
  });

  const batch = writeBatch(db);
  teams.forEach((t) => {
    const memberIds = buckets[t.id];
    const teamXp = memberIds.reduce((sum, pid) => {
      const player = players.find((p) => p.id === pid);
      return sum + (player?.xp ?? 0);
    }, 0);
    batch.update(doc(db, COLLECTIONS.teams, t.id), {
      playerIds: memberIds,
      xp: teamXp,
    });
    memberIds.forEach((pid) => {
      batch.update(doc(db, COLLECTIONS.players, pid), { teamId: t.id });
    });
  });
  // Clear team from players no longer on any team.
  const assigned = new Set(Object.values(buckets).flat());
  players
    .filter((p) => !assigned.has(p.id))
    .forEach((p) =>
      batch.update(doc(db, COLLECTIONS.players, p.id), { teamId: null }),
    );

  await batch.commit();
  await logActivity(eventId, 'team', 'Teams were randomly assigned. 🎲');
}

/**
 * Recompute every team's cached XP from current member XP. Cheap to call after
 * XP changes; in the MVP the leaderboard also computes this live, so this is
 * mostly to keep the stored value reasonably fresh.
 */
export async function recalcTeamXp(
  teams: Team[],
  players: Player[],
): Promise<void> {
  const batch = writeBatch(db);
  teams.forEach((t) => {
    const xp = players
      .filter((p) => p.teamId === t.id)
      .reduce((sum, p) => sum + p.xp, 0);
    if (xp !== t.xp) {
      batch.update(doc(db, COLLECTIONS.teams, t.id), { xp });
    }
  });
  await batch.commit();
}

/** Compute live team standings from players (no write). */
export function computeTeamStandings(
  teams: Team[],
  players: Player[],
): Array<Team & { liveXp: number; memberCount: number }> {
  return teams
    .map((t) => {
      const members = players.filter((p) => p.teamId === t.id);
      return {
        ...t,
        liveXp: members.reduce((sum, p) => sum + p.xp, 0),
        memberCount: members.length,
      };
    })
    .sort((a, b) => b.liveXp - a.liveXp);
}
