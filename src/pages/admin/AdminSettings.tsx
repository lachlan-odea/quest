/**
 * Admin: settings & danger zone — tune game balance, exit admin mode, and
 * reset the whole game.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvent } from '@/hooks/useEvent';
import { useGame } from '@/context/GameContext';
import { resetGame, updateEventSettings } from '@/services/eventService';
import type {
  BattleSettings,
  DivineFavourMode,
  EventSettings,
  QuestDifficulty,
} from '@/types';
import { DEFAULT_EVENT_SETTINGS } from '@/lib/utils';
import { Button, Card, Input, Label, SectionTitle, Select, Spinner } from '@/components/ui';

const DIFFICULTIES: QuestDifficulty[] = ['easy', 'medium', 'hard', 'legendary'];

const DIVINE_FAVOUR_MODES: { value: DivineFavourMode; label: string }[] = [
  { value: 'winnerOnly', label: 'Winner only' },
  { value: 'bothPlayers', label: 'Both players' },
  { value: 'adminTriggered', label: 'Admin triggered' },
  { value: 'disabled', label: 'Disabled' },
];

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

  const bs: BattleSettings =
    draft?.battleSettings ?? DEFAULT_EVENT_SETTINGS.battleSettings;

  function setBattle(patch: Partial<BattleSettings>) {
    if (!draft) return;
    setDraft({ ...draft, battleSettings: { ...bs, ...patch } });
  }

  async function save() {
    if (!eventId || !draft) return;
    setBusy(true);
    try {
      await updateEventSettings(eventId, {
        ...draft,
        battleSettings: draft.battleSettings ?? DEFAULT_EVENT_SETTINGS.battleSettings,
      });
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

        <div>
          <Label>Divine Favour after battles</Label>
          <Select
            value={draft.divineFavourMode ?? 'winnerOnly'}
            onChange={(e) =>
              setDraft({
                ...draft,
                divineFavourMode: e.target.value as DivineFavourMode,
              })
            }
          >
            {DIVINE_FAVOUR_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-parchment-300/70">
            Who may roll on the Table of Divine Favour after a battle.
          </p>
        </div>

        <div className="border-t border-gold-600/20 pt-3">
          <Label>⚔️ Battle rewards & rules</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 text-xs text-parchment-300">Victory XP</p>
              <Input
                inputMode="numeric"
                value={bs.victoryXp}
                onChange={(e) => setBattle({ victoryXp: num(e.target.value, bs.victoryXp) })}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-parchment-300">Glory XP</p>
              <Input
                inputMode="numeric"
                value={bs.gloryXp}
                onChange={(e) => setBattle({ gloryXp: num(e.target.value, bs.gloryXp) })}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-parchment-300">Stat-roll fallback XP</p>
              <Input
                inputMode="numeric"
                value={bs.statRollFallbackXp}
                onChange={(e) =>
                  setBattle({ statRollFallbackXp: num(e.target.value, bs.statRollFallbackXp) })
                }
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-parchment-300">Cooldown (min)</p>
              <Input
                inputMode="numeric"
                value={bs.cooldownMinutesBetweenBattles}
                onChange={(e) =>
                  setBattle({
                    cooldownMinutesBetweenBattles: num(
                      e.target.value,
                      bs.cooldownMinutesBetweenBattles,
                    ),
                  })
                }
              />
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <BoolRow
              label="Divine Favour for stat-roll winner"
              value={bs.triggerDivineFavourForStatWinner}
              onChange={(v) => setBattle({ triggerDivineFavourForStatWinner: v })}
            />
            <BoolRow
              label="Allow player-issued challenges"
              value={bs.allowPlayerIssuedChallenges}
              onChange={(v) => setBattle({ allowPlayerIssuedChallenges: v })}
            />
            <BoolRow
              label="Allow declining challenges"
              value={bs.allowDecline}
              onChange={(v) => setBattle({ allowDecline: v })}
            />
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

/** A labelled Yes/No toggle row built on the Select primitive. */
function BoolRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-parchment-200">{label}</span>
      <Select
        className="w-24 min-h-0 py-2"
        value={value ? 'yes' : 'no'}
        onChange={(e) => onChange(e.target.value === 'yes')}
      >
        <option value="yes">On</option>
        <option value="no">Off</option>
      </Select>
    </div>
  );
}
