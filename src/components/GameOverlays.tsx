/**
 * Decides which global popup (if any) to show. Battle challenges take priority
 * over announcements so a duel is never hidden behind a broadcast.
 */
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import { useBattle } from '@/hooks/useBattle';
import { BattleChallengeModal } from './BattleChallengeModal';
import { AnnouncementOverlay } from './AnnouncementOverlay';

export function GameOverlays() {
  const { player } = usePlayer();
  const { eventId } = useEvent();
  const { incoming } = useBattle(eventId, player?.id);

  if (incoming.length > 0) return <BattleChallengeModal />;
  return <AnnouncementOverlay />;
}
