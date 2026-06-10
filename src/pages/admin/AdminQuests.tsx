/**
 * Admin: quest management — create quests, assign them to players, and mark
 * them complete (awards XP) or failed.
 */
import { useMemo, useState } from 'react';
import { useEvent } from '@/hooks/useEvent';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAllQuests } from '@/hooks/useQuests';
import {
  assignQuest,
  completeQuest,
  createQuest,
  deleteQuest,
  failQuest,
} from '@/services/questService';
import { QUEST_TEMPLATES } from '@/lib/seedData';
import type { Player, Quest, QuestDifficulty } from '@/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  SectionTitle,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui';

const DIFFICULTIES: QuestDifficulty[] = ['easy', 'medium', 'hard', 'legendary'];

export default function AdminQuests() {
  const { event, eventId } = useEvent();
  const { players, loading: pLoading } = useLeaderboard(eventId);
  const { quests, loading: qLoading } = useAllQuests(eventId);
  const [showForm, setShowForm] = useState(false);

  if (pLoading || qLoading || !event) return <Spinner />;

  const grouped = {
    assigned: quests.filter((q) => q.status === 'assigned'),
    unassigned: quests.filter((q) => q.status === 'unassigned'),
    completed: quests.filter((q) => q.status === 'completed'),
    failed: quests.filter((q) => q.status === 'failed'),
  };

  return (
    <div className="flex flex-col gap-4">
      <Button fullWidth onClick={() => setShowForm((v) => !v)}>
        {showForm ? '× Close' : '+ Create Quest'}
      </Button>

      {showForm && eventId && (
        <QuestForm
          eventId={eventId}
          xpByDifficulty={event.settings.questXp}
          onDone={() => setShowForm(false)}
        />
      )}

      {(['unassigned', 'assigned', 'completed', 'failed'] as const).map((key) =>
        grouped[key].length === 0 ? null : (
          <div key={key}>
            <SectionTitle>
              {key[0].toUpperCase() + key.slice(1)} ({grouped[key].length})
            </SectionTitle>
            <div className="flex flex-col gap-2">
              {grouped[key].map((q) => (
                <AdminQuestCard
                  key={q.id}
                  quest={q}
                  players={players}
                  xpPerLevel={event.settings.xpPerLevel}
                />
              ))}
            </div>
          </div>
        ),
      )}

      {quests.length === 0 && (
        <EmptyState
          emoji="📜"
          title="No quests yet"
          subtitle="Create your own or seed the example quests from the dashboard."
        />
      )}
    </div>
  );
}

// ---- Create / quick-add form ------------------------------------------------
function QuestForm({
  eventId,
  xpByDifficulty,
  onDone,
}: {
  eventId: string;
  xpByDifficulty: Record<QuestDifficulty, number>;
  onDone: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<QuestDifficulty>('medium');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createQuest({
        eventId,
        title,
        description,
        difficulty,
        xpReward: xpByDifficulty[difficulty],
        hiddenFromOthers: true,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  function quickFill() {
    const t = QUEST_TEMPLATES[Math.floor(Math.random() * QUEST_TEMPLATES.length)];
    setTitle(t.title);
    setDescription(t.description);
    setDifficulty(t.difficulty);
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label>New quest</Label>
        <Button variant="ghost" className="text-xs" onClick={quickFill}>
          🎲 Random idea
        </Button>
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quest title" />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What must the hero do?"
      />
      <Select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value as QuestDifficulty)}
      >
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>
            {d} · {xpByDifficulty[d]} XP
          </option>
        ))}
      </Select>
      <Button fullWidth onClick={submit} disabled={busy || !title.trim()}>
        {busy ? 'Creating…' : 'Create Quest'}
      </Button>
    </Card>
  );
}

// ---- Quest card with admin actions -----------------------------------------
function AdminQuestCard({
  quest,
  players,
  xpPerLevel,
}: {
  quest: Quest;
  players: Player[];
  xpPerLevel: number;
}) {
  const assignee = useMemo(
    () => players.find((p) => p.id === quest.assignedPlayerId) ?? null,
    [players, quest.assignedPlayerId],
  );
  const isOpen = quest.status === 'assigned' || quest.status === 'unassigned';

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-parchment-100">{quest.title}</p>
          <p className="text-sm text-parchment-300">{quest.description}</p>
        </div>
        <Badge>{quest.xpReward} XP</Badge>
      </div>

      {quest.proofNote && (
        <p className="mt-2 rounded-lg bg-tavern-800/60 p-2 text-xs italic text-parchment-200">
          📝 {quest.proofNote}
        </p>
      )}

      {assignee && (
        <p className="mt-2 text-xs text-gold-300">Assigned to {assignee.name}</p>
      )}

      {isOpen && (
        <div className="mt-3 flex flex-col gap-2 border-t border-gold-600/20 pt-3">
          <Select
            value={quest.assignedPlayerId ?? ''}
            onChange={(e) => {
              const pid = e.target.value;
              if (pid) assignQuest(quest, pid);
            }}
          >
            <option value="">Assign to…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button
              fullWidth
              disabled={!assignee}
              onClick={() => completeQuest(quest, assignee, xpPerLevel)}
            >
              ✅ Complete
            </Button>
            <Button variant="secondary" fullWidth onClick={() => failQuest(quest)}>
              ❌ Fail
            </Button>
          </div>
        </div>
      )}

      <div className="mt-2 flex justify-end">
        <Button
          variant="ghost"
          className="text-xs text-ember"
          onClick={() => {
            if (confirm('Delete this quest?')) deleteQuest(quest);
          }}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}
