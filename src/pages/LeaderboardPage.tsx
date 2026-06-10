/**
 * Leaderboard — player rankings and team standings, with a quick toggle.
 */
import { useState } from 'react';
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { classEmoji } from '@/lib/classes';
import { cn } from '@/lib/utils';
import { Badge, Card, EmptyState, Spinner } from '@/components/ui';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { player } = usePlayer();
  const { eventId } = useEvent();
  const { players, teamStandings, loading } = useLeaderboard(eventId);
  const [tab, setTab] = useState<'players' | 'teams'>('players');

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-tavern-700 p-1">
        {(['players', 'teams'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg py-2.5 text-sm font-semibold capitalize transition-colors',
              tab === t ? 'bg-gold-500 text-tavern-900' : 'text-parchment-200',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'players' ? (
        players.length === 0 ? (
          <EmptyState emoji="🏆" title="No heroes yet" />
        ) : (
          <div className="flex flex-col gap-2">
            {players.map((p, i) => (
              <Card
                key={p.id}
                className={cn(
                  'flex items-center justify-between gap-3',
                  p.id === player?.id && 'border-gold-400 shadow-glow',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center font-display text-lg">
                    {MEDALS[i] ?? `#${i + 1}`}
                  </span>
                  <span className="text-2xl">{classEmoji(p.className)}</span>
                  <div>
                    <p className="font-display text-parchment-100">
                      {p.name}
                      {p.id === player?.id && (
                        <span className="ml-1 text-xs text-gold-300">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-parchment-300">Lv {p.level} · {p.className}</p>
                  </div>
                </div>
                <Badge>{p.xp} XP</Badge>
              </Card>
            ))}
          </div>
        )
      ) : teamStandings.length === 0 ? (
        <EmptyState emoji="🛡️" title="No teams yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {teamStandings.map((t, i) => (
            <Card
              key={t.id}
              className="flex items-center justify-between gap-3"
              style={{ borderColor: `${t.color}66` }}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 text-center font-display text-lg">
                  {MEDALS[i] ?? `#${i + 1}`}
                </span>
                <span
                  className="h-6 w-6 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <div>
                  <p className="font-display text-parchment-100">{t.name}</p>
                  <p className="text-xs text-parchment-300">
                    {t.memberCount} members
                  </p>
                </div>
              </div>
              <Badge>{t.liveXp} XP</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
