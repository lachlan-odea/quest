/**
 * Admin: Divine Favour & effects — trigger rolls for a player, grant the
 * legendary Groom's Blessing, assign debuffs by hand, clear active
 * effects/debuffs, and review the full roll history.
 */
import { useEffect, useMemo, useState } from 'react';
import { useEvent } from '@/hooks/useEvent';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import {
  clearActiveEffect,
  clearAllEffects,
  getDivineFavourHistory,
  rollDivineFavour,
  triggerGroomsBlessing,
} from '@/services/divineFavourService';
import { addDebuff } from '@/services/playerService';
import {
  DEBUFF_LIBRARY,
  DEBUFF_TEMPLATES,
  debuffFromTemplate,
} from '@/lib/seedData';
import { divineFavourResultFor, TIER_META } from '@/lib/divineFavour';
import type { DivineFavourRoll, Player } from '@/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Label,
  SectionTitle,
  Select,
  Spinner,
} from '@/components/ui';
import { ActiveEffectList, ImmunityBanner, TitleList } from '@/components/DivineEffects';
import { timeAgo } from '@/lib/utils';

const ALL_DEBUFFS = [...DEBUFF_LIBRARY, ...DEBUFF_TEMPLATES];

export default function AdminDivineFavour() {
  const { eventId } = useEvent();
  const { players, loading } = useLeaderboard(eventId);
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory] = useState<DivineFavourRoll[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    return getDivineFavourHistory(eventId, null, setHistory, 50);
  }, [eventId]);

  const selected = useMemo(
    () => players.find((p) => p.id === selectedId) ?? null,
    [players, selectedId],
  );
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? 'Unknown';

  if (loading) return <Spinner />;

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>🎲 Divine Favour & Effects</SectionTitle>

      {error && <Card className="border-ember/50 text-ember">{error}</Card>}

      <Card className="flex flex-col gap-3">
        <div>
          <Label>Player</Label>
          <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">— Choose a player —</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Lv {p.level})
              </option>
            ))}
          </Select>
        </div>

        {selected && eventId && (
          <PlayerActions
            player={selected}
            busy={busy}
            onRoll={() => run(() => rollDivineFavour(eventId, selected.id))}
            onBless={() => run(() => triggerGroomsBlessing(eventId, selected.id))}
            onAssignDebuff={(label) =>
              run(async () => {
                const t = ALL_DEBUFFS.find((d) => d.label === label);
                if (t) await addDebuff(selected, debuffFromTemplate(t));
              })
            }
            onClearEffect={(fxId) => run(() => clearActiveEffect(eventId, selected.id, fxId))}
            onClearAll={() => run(() => clearAllEffects(eventId, selected.id))}
          />
        )}
      </Card>

      <div>
        <SectionTitle>Roll History</SectionTitle>
        {history.length === 0 ? (
          <EmptyState emoji="📜" title="No rolls yet" />
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((h) => {
              const result = divineFavourResultFor(h.roll);
              const meta = TIER_META[h.triggeredGroomsBlessing ? 'legendary' : result.tier];
              return (
                <Card key={h.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-parchment-100">
                      {meta.emoji} {nameOf(h.playerId)} — {h.resultName}
                    </p>
                    <p className="text-xs text-parchment-300">
                      rolled {h.roll}
                      {h.secondRoll != null ? ` + ${h.secondRoll}` : ''} · {timeAgo(h.createdAt)}
                    </p>
                  </div>
                  <Badge>{meta.label}</Badge>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerActions({
  player,
  busy,
  onRoll,
  onBless,
  onAssignDebuff,
  onClearEffect,
  onClearAll,
}: {
  player: Player;
  busy: boolean;
  onRoll: () => void;
  onBless: () => void;
  onAssignDebuff: (label: string) => void;
  onClearEffect: (fxId: string) => void;
  onClearAll: () => void;
}) {
  const [debuffLabel, setDebuffLabel] = useState(ALL_DEBUFFS[0]?.label ?? '');
  const effects = player.activeEffects ?? [];

  return (
    <div className="flex flex-col gap-3 border-t border-gold-600/20 pt-3">
      <ImmunityBanner player={player} />
      <TitleList titles={player.titles ?? []} />

      <div className="flex gap-2">
        <Button fullWidth disabled={busy} onClick={onRoll}>
          🎲 Trigger Roll
        </Button>
        <Button fullWidth variant="secondary" disabled={busy} onClick={onBless}>
          👑 Groom's Blessing
        </Button>
      </div>

      <div>
        <Label>Assign a debuff</Label>
        <div className="flex gap-2">
          <Select value={debuffLabel} onChange={(e) => setDebuffLabel(e.target.value)}>
            {ALL_DEBUFFS.map((d) => (
              <option key={d.label} value={d.label}>
                {d.label}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            className="px-3"
            disabled={busy}
            onClick={() => onAssignDebuff(debuffLabel)}
          >
            Apply
          </Button>
        </div>
      </div>

      {(player.activeDebuffs.length > 0 || effects.length > 0) && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-parchment-200">Active debuffs & effects</p>
            <Button
              variant="ghost"
              className="text-xs text-ember"
              disabled={busy}
              onClick={onClearAll}
            >
              Clear all
            </Button>
          </div>
          {player.activeDebuffs.map((d) => (
            <Card key={d.id} className="border-ember/40">
              <p className="font-semibold text-ember">☠️ {d.label}</p>
              <p className="text-sm text-parchment-200">{d.description}</p>
            </Card>
          ))}
          <ActiveEffectList effects={effects} onClear={onClearEffect} />
        </div>
      )}
    </div>
  );
}
