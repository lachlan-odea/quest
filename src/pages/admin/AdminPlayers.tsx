/**
 * Admin: player management — view everyone, reset their roll, change team,
 * rename, or remove them from the game.
 */
import { useState } from 'react';
import { useEvent } from '@/hooks/useEvent';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { deletePlayer, setTeam, updatePlayer } from '@/services/playerService';
import { classEmoji } from '@/lib/classes';
import type { Player } from '@/types';
import { Badge, Button, Card, EmptyState, Input, SectionTitle, Select, Spinner } from '@/components/ui';

export default function AdminPlayers() {
  const { eventId } = useEvent();
  const { players, teams, loading } = useLeaderboard(eventId);
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Players ({players.length})</SectionTitle>
      {players.length === 0 ? (
        <EmptyState emoji="🧙" title="No players yet" subtitle="Share your join code to get the party started." />
      ) : (
        players.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            teams={teams}
            open={openId === p.id}
            onToggle={() => setOpenId(openId === p.id ? null : p.id)}
          />
        ))
      )}
    </div>
  );
}

function PlayerRow({
  player,
  teams,
  open,
  onToggle,
}: {
  player: Player;
  teams: { id: string; name: string }[];
  open: boolean;
  onToggle: () => void;
}) {
  const [name, setName] = useState(player.name);

  return (
    <Card>
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{classEmoji(player.className)}</span>
          <div className="text-left">
            <p className="font-display text-parchment-100">{player.name}</p>
            <p className="text-xs text-parchment-300">
              Lv {player.level} · {player.xp} XP · {player.className}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!player.hasRolled && <Badge color="#d9531e">Not rolled</Badge>}
          <span className="text-parchment-300">{open ? '▾' : '▸'}</span>
        </div>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-gold-600/20 pt-3">
          <div>
            <label className="mb-1 block text-xs text-parchment-300">Name</label>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <Button
                variant="secondary"
                className="px-3"
                onClick={() => updatePlayer(player.id, { name })}
              >
                Save
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-parchment-300">Team</label>
            <Select
              value={player.teamId ?? ''}
              onChange={(e) => setTeam(player.id, e.target.value || null)}
            >
              <option value="">— No team —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() =>
                updatePlayer(player.id, {
                  hasRolled: false,
                  stats: {
                    stamina: 0,
                    rizz: 0,
                    shenanigans: 0,
                    vibes: 0,
                  },
                })
              }
            >
              🎲 Reset Roll
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                if (confirm(`Remove ${player.name} from the game?`)) {
                  deletePlayer(player.id);
                }
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
