/**
 * Dice roll page — roll the full character sheet with a fun animation.
 * Method: 4d6, drop the lowest, for each of the four bucks-night attributes
 * (Stamina, Rizz, Shenanigans, Vibes). One roll only, unless the admin resets
 * the player.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';
import {
  rollAbilityScore,
  STAT_KEYS,
  STAT_LABELS,
  STAT_BLURBS,
  statModifier,
  formatModifier,
} from '@/lib/dice';
import { rollStats } from '@/services/playerService';
import type { StatBlock, StatKey } from '@/types';
import { Button, Card, Spinner } from '@/components/ui';
import { DieFace } from '@/components/Dice';
import { cn } from '@/lib/utils';

interface RolledStat {
  key: StatKey;
  dice: number[];
  lowestIdx: number;
  total: number;
}

function rollAll(): RolledStat[] {
  return STAT_KEYS.map((key) => {
    const { dice, total } = rollAbilityScore();
    const min = Math.min(...dice);
    return { key, dice, lowestIdx: dice.indexOf(min), total };
  });
}

export default function DiceRollPage() {
  const { player, loading } = usePlayer();
  const navigate = useNavigate();
  const [rolling, setRolling] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [rolls, setRolls] = useState<RolledStat[] | null>(null);
  const [saving, setSaving] = useState(false);
  const timers = useRef<number[]>([]);

  // Already rolled? Show the locked sheet instead.
  useEffect(() => {
    if (player?.hasRolled) navigate('/sheet', { replace: true });
  }, [player, navigate]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function handleRoll() {
    const result = rollAll();
    setRolls(result);
    setRevealed(0);
    setRolling(true);
    // Reveal each stat one at a time for drama.
    result.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setRevealed(i + 1);
        if (i === result.length - 1) setRolling(false);
      }, 600 + i * 450);
      timers.current.push(t);
    });
  }

  async function handleSave() {
    if (!player || !rolls) return;
    setSaving(true);
    const stats = rolls.reduce((acc, r) => {
      acc[r.key] = r.total;
      return acc;
    }, {} as StatBlock);
    try {
      await rollStats(player, stats);
      navigate('/sheet', { replace: true });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  const done = !!rolls && !rolling && revealed === STAT_KEYS.length;

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6">
      <div className="mb-4 text-center">
        <h1 className="font-display text-3xl gold-text">Roll for Glory</h1>
        <p className="text-sm text-parchment-300">
          4d6, drop the lowest — the dice decide your fate. You only roll once!
        </p>
      </div>

      {!rolls && (
        <Card className="flex flex-col items-center gap-4 py-10">
          <div className="text-6xl">🎲</div>
          <p className="text-center text-parchment-200">
            Ready, {player?.name}? The tavern goes quiet…
          </p>
          <Button fullWidth onClick={handleRoll}>
            Roll the Dice!
          </Button>
        </Card>
      )}

      {rolls && (
        <div className="flex flex-col gap-2">
          {rolls.map((r, i) => (
            <div
              key={r.key}
              className={cn(
                'tavern-card flex items-center justify-between gap-2 p-3 transition-opacity',
                i < revealed ? 'opacity-100 animate-float-up' : 'opacity-20',
              )}
            >
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs uppercase tracking-wide text-parchment-300">
                  {STAT_LABELS[r.key]}
                </p>
                {i < revealed && (
                  <>
                    <p className="font-display text-2xl text-parchment-100">
                      {r.total}
                      <span className="ml-1 text-sm text-gold-300">
                        ({formatModifier(statModifier(r.total))})
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-tight text-parchment-300/70">
                      {STAT_BLURBS[r.key]}
                    </p>
                  </>
                )}
              </div>
              <div className="flex gap-1.5">
                {r.dice.map((d, di) => (
                  <DieFace
                    key={di}
                    value={i < revealed ? d : 0}
                    rolling={rolling && i === revealed}
                    size="sm"
                    dimmed={i < revealed && di === r.lowestIdx}
                  />
                ))}
              </div>
            </div>
          ))}

          {done && (
            <Button
              fullWidth
              className="mt-3"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Lock In My Hero ✔'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
