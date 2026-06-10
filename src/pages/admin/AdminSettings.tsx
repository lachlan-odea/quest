/**
 * Admin: settings & danger zone — tune game balance, exit admin mode, and
 * reset the whole game.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvent } from '@/hooks/useEvent';
import { useGame } from '@/context/GameContext';
import { resetGame, updateEventSettings } from '@/services/eventService';
import type { EventSettings, QuestDifficulty } from '@/types';
import { Button, Card, Input, Label, SectionTitle, Spinner } from '@/components/ui';

const DIFFICULTIES: QuestDifficulty[] = ['easy', 'medium', 'hard', 'legendary'];

export default function AdminSettings() {
  const { event, eventId } = useEvent();
  const { exitAdminMode } = useGame();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<EventSettings | null>(
    event?.settings ?? null,
  );
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!event || !eventId || !draft) return <Spinner />;

  function num(v: string, fallback: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  async function save() {
    if (!eventId || !draft) return;
    setBusy(true);
    try {
      await updateEventSettings(eventId, draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setBusy(false);
    }
  }

  async function doReset() {
    if (!eventId) return;
    if (
      !confirm(
        'Reset the game? This deletes ALL players, teams, quests, battles, upgrades and activity. The event & join code stay. This cannot be undone.',
      )
    )
      return;
    setBusy(true);
    try {
      await resetGame(eventId);
      navigate('/admin');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <SectionTitle>Game Balance</SectionTitle>

        <div>
          <Label>XP per level</Label>
          <Input
            inputMode="numeric"
            value={draft.xpPerLevel}
            onChange={(e) =>
              setDraft({ ...draft, xpPerLevel: num(e.target.value, draft.xpPerLevel) })
            }
          />
        </div>

        <div>
          <Label>Battle XP reward</Label>
          <Input
            inputMode="numeric"
            value={draft.battleXpReward}
            onChange={(e) =>
              setDraft({
                ...draft,
                battleXpReward: num(e.target.value, draft.battleXpReward),
              })
            }
          />
        </div>

        <div>
          <Label>Battle cooldown (seconds)</Label>
          <Input
            inputMode="numeric"
            value={draft.battleCooldownSeconds}
            onChange={(e) =>
              setDraft({
                ...draft,
                battleCooldownSeconds: num(
                  e.target.value,
                  draft.battleCooldownSeconds,
                ),
              })
            }
          />
        </div>

        <div>
          <Label>Quest XP by difficulty</Label>
          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTIES.map((d) => (
              <div key={d}>
                <p className="mb-1 text-xs capitalize text-parchment-300">{d}</p>
                <Input
                  inputMode="numeric"
                  value={draft.questXp[d]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      questXp: {
                        ...draft.questXp,
                        [d]: num(e.target.value, draft.questXp[d]),
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <Button fullWidth onClick={save} disabled={busy}>
          {saved ? 'Saved ✓' : 'Save Settings'}
        </Button>
      </Card>

      <Button
        variant="secondary"
        fullWidth
        onClick={() => {
          exitAdminMode();
          navigate('/sheet');
        }}
      >
        🚪 Exit Admin Mode
      </Button>

      <Card className="border-ember/40">
        <SectionTitle>Danger Zone</SectionTitle>
        <p className="mb-3 text-sm text-parchment-300">
          Wipe all game data and start fresh. The event and its join code are
          kept so players can stay joined.
        </p>
        <Button variant="danger" fullWidth onClick={doReset} disabled={busy}>
          🔥 Reset Game
        </Button>
      </Card>
    </div>
  );
}
