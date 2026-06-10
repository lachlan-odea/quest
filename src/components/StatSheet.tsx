/** Displays a StatBlock as a grid of stat tiles with D&D modifiers. */
import type { StatBlock, StatKey } from '@/types';
import { STAT_KEYS, STAT_LABELS, formatModifier, statModifier } from '@/lib/dice';
import { cn } from '@/lib/utils';

export function StatSheet({
  stats,
  compact = false,
}: {
  stats: StatBlock;
  compact?: boolean;
}) {
  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-2')}>
      {STAT_KEYS.map((key) => (
        <StatTile key={key} statKey={key} value={stats[key]} compact={compact} />
      ))}
    </div>
  );
}

function StatTile({
  statKey,
  value,
  compact,
}: {
  statKey: StatKey;
  value: number;
  compact: boolean;
}) {
  const mod = statModifier(value);
  return (
    <div className="tavern-card flex items-center justify-between gap-2 p-3">
      <div className="min-w-0">
        <p className="truncate text-xs uppercase tracking-wide text-parchment-300">
          {compact ? STAT_LABELS[statKey].slice(0, 3) : STAT_LABELS[statKey]}
        </p>
        <p className="font-display text-2xl text-parchment-100">{value}</p>
      </div>
      <div
        className={cn(
          'flex h-10 w-10 flex-none items-center justify-center rounded-lg font-display text-lg font-bold',
          mod >= 0
            ? 'bg-gold-500/20 text-gold-300'
            : 'bg-ember/20 text-ember',
        )}
      >
        {formatModifier(mod)}
      </div>
    </div>
  );
}
