/**
 * useLeaderboard — real-time player + team standings for an event.
 */
import { useEffect, useState } from 'react';
import type { Player, Team } from '@/types';
import { subscribePlayers } from '@/services/playerService';
import { subscribeTeams, computeTeamStandings } from '@/services/teamService';

export function useLeaderboard(eventId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setPlayers([]);
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubP = subscribePlayers(eventId, (p) => {
      setPlayers(p);
      setLoading(false);
    });
    const unsubT = subscribeTeams(eventId, setTeams);
    return () => {
      unsubP();
      unsubT();
    };
  }, [eventId]);

  // players are already sorted by xp desc from Firestore.
  const teamStandings = computeTeamStandings(teams, players);

  return { players, teams, teamStandings, loading };
}
