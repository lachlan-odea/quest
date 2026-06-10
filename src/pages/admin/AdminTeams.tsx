/**
 * Admin: team management — create teams, randomise membership, edit, delete.
 */
import { useState } from 'react';
import { useEvent } from '@/hooks/useEvent';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import {
  createTeam,
  deleteTeam,
  randomiseTeams,
  updateTeam,
} from '@/services/teamService';
import type { Player, Team } from '@/types';
import { Badge, Button, Card, EmptyState, Input, SectionTitle, Spinner } from '@/components/ui';

const COLORS = ['#d4a531', '#5b8fd6', '#d9531e', '#6db36d', '#b06bd6', '#e8c469'];

export default function AdminTeams() {
  const { eventId } = useEvent();
  const { players, teams, loading } = useLeaderboard(eventId);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Spinner />;

  async function add() {
    if (!eventId || !name.trim()) return;
    setBusy(true);
    try {
      await createTeam(eventId, name, color);
      setName('');
    } finally {
      setBusy(false);
    }
  }

  async function randomise() {
    if (!eventId) return;
    setError(null);
    setBusy(true);
    try {
      await randomiseTeams(eventId, players, teams);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionTitle>Create a Team</SectionTitle>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Team name"
          maxLength={30}
        />
        <div className="mt-3 flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="h-8 w-8 rounded-full border-2"
              style={{
                backgroundColor: c,
                borderColor: color === c ? '#fff' : 'transparent',
              }}
            />
          ))}
        </div>
        <Button fullWidth className="mt-3" onClick={add} disabled={busy || !name.trim()}>
          + Add Team
        </Button>
      </Card>

      <Button variant="secondary" fullWidth onClick={randomise} disabled={busy}>
        🎲 Randomly Assign All Players to Teams
      </Button>
      {error && <p className="text-sm text-ember">{error}</p>}

      <SectionTitle>Teams ({teams.length})</SectionTitle>
      {teams.length === 0 ? (
        <EmptyState emoji="🛡️" title="No teams yet" />
      ) : (
        teams.map((t) => (
          <TeamRow key={t.id} team={t} players={players} />
        ))
      )}
    </div>
  );
}

function TeamRow({ team, players }: { team: Team; players: Player[] }) {
  const [name, setName] = useState(team.name);
  const members = players.filter((p) => p.teamId === team.id);

  return (
    <Card style={{ borderColor: `${team.color}66` }}>
      <div className="flex items-center gap-2">
        <span className="h-6 w-6 flex-none rounded-full" style={{ backgroundColor: team.color }} />
        <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        <Button
          variant="secondary"
          className="px-3"
          onClick={() => updateTeam(team.id, { name })}
        >
          Save
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {members.length === 0 ? (
          <span className="text-xs text-parchment-300/70">No members</span>
        ) : (
          members.map((m) => <Badge key={m.id}>{m.name}</Badge>)
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-parchment-300">
          {members.reduce((s, m) => s + m.xp, 0)} XP total
        </span>
        <Button
          variant="ghost"
          className="text-sm text-ember"
          onClick={() => {
            if (confirm(`Delete team "${team.name}"?`)) deleteTeam(team);
          }}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}
