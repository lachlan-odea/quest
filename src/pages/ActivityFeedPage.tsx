/**
 * Activity feed — a running log of everything happening in the game.
 */
import { useEvent } from '@/hooks/useEvent';
import { useActivity } from '@/hooks/useActivity';
import { timeAgo } from '@/lib/utils';
import type { ActivityType } from '@/types';
import { EmptyState, SectionTitle, Spinner } from '@/components/ui';

const ICONS: Record<ActivityType, string> = {
  event: '🎉',
  player: '🧙',
  quest: '📜',
  battle: '⚔️',
  upgrade: '🛒',
  xp: '⭐',
  team: '🛡️',
};

export default function ActivityFeedPage() {
  const { eventId } = useEvent();
  const { entries, loading } = useActivity(eventId);

  if (loading) return <Spinner />;

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>The Tavern Tales</SectionTitle>
      {entries.length === 0 ? (
        <EmptyState emoji="📰" title="Quiet so far" subtitle="The legend is just beginning." />
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-3 rounded-xl border border-gold-600/15 bg-tavern-700/50 p-3"
            >
              <span className="text-xl">{ICONS[e.type]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-parchment-100">{e.message}</p>
                <p className="text-xs text-parchment-300/70">
                  {timeAgo(e.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
