/**
 * Announcement popup — shows the newest admin broadcast this device hasn't
 * dismissed, centre-screen. Dismissible (unlike battle challenges).
 */
import { useEvent } from '@/hooks/useEvent';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification } from '@/types';
import { Modal } from './Modal';
import { Button } from './ui';

const TONE: Record<AppNotification['tone'], { emoji: string; border: string }> = {
  info: { emoji: '📣', border: 'border-gold-500/60' },
  warning: { emoji: '⚠️', border: 'border-ember/70' },
  celebrate: { emoji: '🎉', border: 'border-gold-400' },
};

export function AnnouncementOverlay() {
  const { eventId } = useEvent();
  const { current, dismiss } = useNotifications(eventId);

  if (!current) return null;
  const tone = TONE[current.tone] ?? TONE.info;

  return (
    <Modal className={tone.border}>
      <div className="text-center">
        <div className="text-5xl">{tone.emoji}</div>
        <h2 className="mt-2 font-display text-2xl gold-text">{current.title}</h2>
        <p className="mt-2 whitespace-pre-wrap text-parchment-100">
          {current.message}
        </p>
      </div>
      <Button fullWidth className="mt-5" onClick={() => dismiss(current)}>
        Got it!
      </Button>
    </Modal>
  );
}
