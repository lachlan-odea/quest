/**
 * Dice visuals + a reusable rolling animation hook.
 */
import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** A single die face showing a number, with an optional spin animation. */
export function DieFace({
  value,
  rolling = false,
  size = 'md',
  dimmed = false,
}: {
  value: number;
  rolling?: boolean;
  size?: 'sm' | 'md' | 'lg';
  dimmed?: boolean;
}) {
  const sizes = {
    sm: 'h-9 w-9 text-base',
    md: 'h-12 w-12 text-xl',
    lg: 'h-16 w-16 text-3xl',
  };
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg border-2 font-display font-bold',
        'border-gold-500/60 bg-gradient-to-br from-parchment-100 to-parchment-300 text-tavern-900 shadow-md',
        rolling && 'animate-dice-spin',
        dimmed && 'opacity-40',
        sizes[size],
      )}
    >
      {value}
    </div>
  );
}

/**
 * useRollAnimation — runs a short "shuffling numbers" animation, then settles
 * on the real result. Returns the currently displayed value and a trigger.
 *
 * `compute` is called once at settle time to get the true result, so callers
 * stay in control of the actual dice maths (in lib/dice).
 */
export function useRollAnimation(durationMs = 700) {
  const [display, setDisplay] = useState<number[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<number | null>(null);

  const roll = useCallback(
    (compute: () => number[], onDone?: (final: number[]) => void) => {
      setRolling(true);
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        if (elapsed >= durationMs) {
          const final = compute();
          setDisplay(final);
          setRolling(false);
          onDone?.(final);
          return;
        }
        // Flicker random faces while "rolling".
        setDisplay((prev) =>
          (prev ?? [0]).map(() => Math.floor(Math.random() * 6) + 1),
        );
        timer.current = window.setTimeout(tick, 70);
      };
      tick();
    },
    [durationMs],
  );

  return { display, rolling, roll, setDisplay };
}
