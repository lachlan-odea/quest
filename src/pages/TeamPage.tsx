/**
 * Team page — the player's team, its members, colour, XP and current rank.
 */
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { classEmoji } from '@/lib/classes';
import { Badge, Card, EmptyState, SectionTitle, Spinner } from '@/components/ui';

export default function TeamPage() {
  const { player, loading } = usePlayer();
  const { eventId } = useEvent();
  const { players, teamStandings } = useLeaderboard(eventId);

  if (loading || !player) return <Spinner />;

  if (!player.teamId) {
    return (
      <EmptyState
        emoji="🛡️"
        title="No team yet"
        subtitle="Your Game Master will assign teams soon. Glory awaits!"
      />
    );
  }

  const rank = teamStandings.findIndex((t) => t.id === player.teamId);
  const team = teamStandings[rank];
  if (!team) return <Spinner />;

  const members = players.filter((p) => p.teamId === team.id);

  return (
    <div className="flex flex-col gap-4">
      <Card style={{ borderColor: `${team.color}88` }} className="text-center">
        <div
          className="mx-auto mb-2 h-12 w-12 rounded-full"
          style={{ backgroundColor: team.color }}
        />
        <h1 className="font-display text-2xl" style={{ color: team.color }}>
          {team.name}
        </h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Badge>Rank #{rank + 1}</Badge>
          <Badge>{team.liveXp} XP</Badge>
          <Badge>{team.memberCount} members</Badge>
        </div>
      </Card>

      <div>
        <SectionTitle>Party Members</SectionTitle>
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <Card
              key={m.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{classEmoji(m.className)}</span>
                <div>
                  <p className="font-display text-parchment-100">
                    {m.name}
                    {m.id === player.id && (
                      <span className="ml-2 text-xs text-gold-300">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-parchment-300">{m.className}</p>
                </div>
              </div>
              <Badge>{m.xp} XP</Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
