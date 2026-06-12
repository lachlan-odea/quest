/**
 * Divine Favour page — roll on the d20 Table of Divine Favour after battles,
 * major quests, or whenever the Game Master allows. Animates the roll, reveals
 * the result with its tier, handles the legendary double-20 Groom's Blessing
 * (with confetti), and lets the player resolve a Divine Intervention choice.
 */
import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import {
  getDivineFavourHistory,
  resolveDivineChoice,
  rollDivineFavour,
  type RollOutcome,
} from '@/services/divineFavourService';
import { divineFavourResultFor, TIER_META } from '@/lib/divineFavour';
import type { DivineFavourRoll } from '@/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionTitle,
  Spinner,
} from '@/components/ui';
import { Confetti } from '@/components/Confetti';
import { ActiveEffectList, ImmunityBanner, TitleList } from '@/components/DivineEffects';
import { cn, timeAgo } from '@/lib/utils';

export default function DivineFavourPage() {
  const { player, loading } = usePlayer();
  const { eventId } = useEvent();
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(20);
  const [outcome, setOutcome] = useState<RollOutcome | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DivineFavourRoll[]>([]);
  const flicker = useRef<number | null>(null);

  useEffect(() => {
    if (!eventId || !player) return;
    return getDivineFavourHistory(eventId, player.id, setHistory, 25);
  }, [eventId, player?.id]);

  useEffect(() => () => {
    if (flicker.current) clearInterval(flicker.current);
  }, []);

  if (loading || !player) return <Spinner />;

  const pending = player.pendingDivineChoice;

  async function handleRoll() {
    if (!eventId || !player) return;
    setError(null);
    setOutcome(null);
    setRolling(true);
    // Cosmetic d20 flicker while we resolve the real roll.
    flicker.current = window.setInterval(
      () => setFace(Math.floor(Math.random() * 20) + 1),
      80,
    );
    const started = Date.now();
    try {
      const res = await rollDivineFavour(eventId, player.id);
      const elapsed = Date.now() - started;
      // Ensure the animation runs for at least ~900ms for drama.
      window.setTimeout(() => {
        if (flicker.current) clearInterval(flicker.current);
        setFace(res.record.roll);
        setOutcome(res);
        setRolling(false);
        if (res.record.triggeredGroomsBlessing) setConfetti(true);
      }, Math.max(0, 900 - elapsed));
    } catch (e) {
      if (flicker.current) clearInterval(flicker.current);
      setError((e as Error).message);
      setRolling(false);
    }
  }

  async function choose(choiceId: string) {
    if (!eventId || !player) return;
    setError(null);
    try {
      await resolveDivineChoice(eventId, player.id, choiceId);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {confetti && <Confetti onDone={() => setConfetti(false)} />}

      <div className="text-center">
        <h1 className="font-display text-3xl gold-text">Table of Divine Favour</h1>
        <p className="text-sm text-parchment-300">
          The gods are watching. Roll a d20 and accept your fate.
        </p>
      </div>

      {error && <Card className="border-ember/50 text-ember">{error}</Card>}

      <ImmunityBanner player={player} />

      {/* Pending Divine Intervention choice */}
      {pending && (
        <Card className="border-gold-400/70 bg-gold-500/10">
          <SectionTitle>🌟 Divine Intervention</SectionTitle>
          <p className="mb-3 text-sm text-parchment-200">
            The heavens open — choose ONE reward:
          </p>
          <div className="flex flex-col gap-2">
            {divineFavourResultFor(pending.roll).choices?.map((c) => (
              <Button key={c.id} fullWidth variant="secondary" onClick={() => choose(c.id)}>
                {c.label}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* The die + roll button */}
      <Card className="flex flex-col items-center gap-4 py-8">
        <div
          className={cn(
            'flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-gold-500/60',
            'bg-gradient-to-br from-parchment-100 to-parchment-300 font-display text-5xl font-bold text-tavern-900 shadow-md',
            rolling && 'animate-dice-spin',
          )}
        >
          {face}
        </div>
        <Button fullWidth onClick={handleRoll} disabled={rolling || !!pending}>
          {rolling ? 'The dice tumble…' : '🎲 Roll Divine Favour'}
        </Button>
        {pending && (
          <p className="text-center text-xs text-parchment-300/70">
            Resolve your Divine Intervention choice above before rolling again.
          </p>
        )}
      </Card>

      {/* Result reveal */}
      {outcome && !rolling && <ResultCard outcome={outcome} />}

      {/* Active effects */}
      {(player.activeEffects?.length ?? 0) > 0 && (
        <div>
          <SectionTitle>Active Effects</SectionTitle>
          <ActiveEffectList effects={player.activeEffects ?? []} />
        </div>
      )}

      {(player.titles?.length ?? 0) > 0 && (
        <div>
          <SectionTitle>Titles</SectionTitle>
          <TitleList titles={player.titles ?? []} />
        </div>
      )}

      {/* History */}
      <div>
        <SectionTitle>Your Divine Favour History</SectionTitle>
        {history.length === 0 ? (
          <EmptyState emoji="📜" title="No rolls yet" subtitle="Your fate is unwritten." />
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((h) => (
              <HistoryRow key={h.id} roll={h} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ outcome }: { outcome: RollOutcome }) {
  const { result, record } = outcome;
  const meta = TIER_META[result.tier];
  return (
    <Card className={cn('animate-pop-in text-center', meta.border, meta.bg)}>
      <div className="text-5xl">{meta.emoji}</div>
      <Badge className="mx-auto mt-2">{meta.label}</Badge>
      <h2 className={cn('mt-2 font-display text-2xl', meta.text)}>{result.name}</h2>
      <p className="mt-1 text-sm text-parchment-200">{result.description}</p>
      {record.triggeredGroomsBlessing && (
        <p className="mt-2 font-display text-lg text-gold-300">
          DOUBLE 20 — rolled {record.roll} then {record.secondRoll}!
        </p>
      )}
      <div className="mt-3 flex flex-col gap-1 text-sm text-parchment-200">
        {result.effects.length > 0
          ? result.effects.map((e, i) => (
              <p key={i}>• {e.description ?? e.type}</p>
            ))
          : outcome.awaitingChoice && <p>• Choose your reward above ☝️</p>}
      </div>
    </Card>
  );
}

function HistoryRow({ roll }: { roll: DivineFavourRoll }) {
  const result = divineFavourResultFor(roll.roll);
  const meta = TIER_META[roll.triggeredGroomsBlessing ? 'legendary' : result.tier];
  return (
    <Card className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-parchment-100">
          {meta.emoji} {roll.resultName}
        </p>
        <p className="text-xs text-parchment-300">
          rolled {roll.roll}
          {roll.secondRoll != null ? ` + ${roll.secondRoll}` : ''} · {timeAgo(roll.createdAt)}
        </p>
      </div>
      <Badge>{meta.label}</Badge>
    </Card>
  );
}
