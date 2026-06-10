/**
 * Admin: battle history — review all battles and cancel any that are stuck
 * pending.
 */
import { useEvent } from '@/hooks/useEvent';
import { useBattle } from '@/hooks/useBattle';
import { cancelBattle } from '@/services/battleService';
import { STAT_LABELS } from '@/lib/dice';
import { timeAgo } from '@/lib/utils';
import { Badge, Button, Card, EmptyState, SectionTitle, Spinner } from '@/components/ui';

export default function AdminBattles() {
  const { eventId } = useEvent();
  const { battles, loading } = useBattle(eventId);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>All Battles ({battles.length})</SectionTitle>
      {battles.length === 0 ? (
        <EmptyState emoji="⚔️" title="No battles yet" />
      ) : (
        battles.map((b) => {
          const completed = b.status === 'completed';
          const winnerName =
            b.winnerId === b.challengerId ? b.challengerName : b.defenderName;
          return (
            <Card key={b.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-parchment-100">
                  {b.challengerName}{' '}
                  <span className="text-parchment-300">
                    ({STAT_LABELS[b.challengerStat]})
                  </span>{' '}
                  vs {b.defenderName}
                </p>
                <p className="text-xs text-parchment-300">
                  {timeAgo(b.createdAt)}
                  {completed &&
                    ` · ${b.challengerTotal} vs ${b.defenderTotal}`}
                </p>
              </div>
              {completed ? (
                <Badge>🏆 {winnerName}</Badge>
              ) : b.status === 'pending' ? (
                <Button
                  variant="ghost"
                  className="text-xs text-ember"
                  onClick={() => cancelBattle(b)}
                >
                  Cancel
                </Button>
              ) : (
                <Badge color="#999">{b.status}</Badge>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
