/**
 * Hidden quests page — the player sees ONLY their own quests (enforced by
 * Firestore rules too). They can jot a proof note; the Game Master marks
 * quests complete and awards XP.
 */
import { useState } from 'react';
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import { useQuests } from '@/hooks/useQuests';
import { submitProof } from '@/services/questService';
import { STAT_LABELS } from '@/lib/dice';
import type { Quest, QuestDifficulty } from '@/types';
import { Badge, Button, EmptyState, SectionTitle, Spinner, Textarea } from '@/components/ui';

const DIFFICULTY: Record<QuestDifficulty, { label: string; color: string }> = {
  easy: { label: 'Easy', color: '#6db36d' },
  medium: { label: 'Medium', color: '#d4a531' },
  hard: { label: 'Hard', color: '#d9531e' },
  legendary: { label: 'Legendary', color: '#b06bd6' },
};

export default function QuestsPage() {
  const { player, loading } = usePlayer();
  const { eventId } = useEvent();
  const { active, completed, failed } = useQuests(eventId, player?.id ?? null);

  if (loading || !player) return <Spinner />;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionTitle>Your Secret Quests</SectionTitle>
        <p className="-mt-2 mb-3 text-sm text-parchment-300">
          Shhh — only you can see these. Complete them on the sly.
        </p>
        {active.length === 0 ? (
          <EmptyState
            emoji="📜"
            title="No active quests"
            subtitle="Your Game Master will assign your secret missions soon."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {active.map((q) => (
              <QuestCard key={q.id} quest={q} editable />
            ))}
          </div>
        )}
      </div>

      {completed.length > 0 && (
        <div>
          <SectionTitle>Completed ✅</SectionTitle>
          <div className="flex flex-col gap-3">
            {completed.map((q) => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        </div>
      )}

      {failed.length > 0 && (
        <div>
          <SectionTitle>Failed ❌</SectionTitle>
          <div className="flex flex-col gap-3">
            {failed.map((q) => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest, editable }: { quest: Quest; editable?: boolean }) {
  const [note, setNote] = useState(quest.proofNote ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const diff = DIFFICULTY[quest.difficulty];

  async function save() {
    setSaving(true);
    try {
      await submitProof(quest.id, note);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="parchment-card p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-display text-lg leading-tight">{quest.title}</h3>
        <Badge color={diff.color}>{diff.label}</Badge>
      </div>
      <p className="text-sm text-tavern-800">{quest.description}</p>
      {quest.recommendedAttribute && (
        <p className="mt-1 text-xs font-semibold text-tavern-700">
          🎯 Best tackled with {STAT_LABELS[quest.recommendedAttribute]}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gold-600">
        🏅 {quest.xpReward} XP
        {quest.status === 'completed' && quest.completedAt && (
          <span className="text-tavern-700">· done</span>
        )}
      </div>

      {editable && (
        <div className="mt-3 border-t border-tavern-900/10 pt-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note or describe your proof (photos go to your GM in person)…"
            className="bg-white/50 text-tavern-900 placeholder:text-tavern-700/40"
          />
          <Button
            variant="secondary"
            fullWidth
            className="mt-2"
            onClick={save}
            disabled={saving}
          >
            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Submit Proof Note'}
          </Button>
        </div>
      )}
    </div>
  );
}
