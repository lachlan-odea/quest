/**
 * Shared renderers for Divine Favour state: earned titles, debuff immunity, and
 * the list of active behavioural effects. Reused on the character sheet, the
 * Divine Favour page and the admin tools.
 */
import type { ActiveEffect, Player } from '@/types';
import { timeAgo } from '@/lib/utils';
import { Badge, Card } from './ui';

/** Titles row (honorary names earned via Divine Favour, upgrades, etc.). */
export function TitleList({ titles }: { titles: string[] }) {
  if (!titles || titles.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {titles.map((t) => (
        <Badge key={t}>👑 {t}</Badge>
      ))}
    </div>
  );
}

/** Banner shown while a player is immune to debuffs. */
export function ImmunityBanner({ player }: { player: Player }) {
  const immune = !!player.debuffImmuneUntil && player.debuffImmuneUntil > Date.now();
  if (!immune) return null;
  return (
    <Card className="border-gold-400 bg-gold-500/10 text-center">
      <p className="font-display text-gold-300">🛡️ Debuff Immunity Active</p>
      <p className="text-xs text-parchment-300">
        Blessed by the Groom — debuffs slide right off you.
      </p>
    </Card>
  );
}

/** List of active behavioural effects, with an optional admin clear button. */
export function ActiveEffectList({
  effects,
  onClear,
}: {
  effects: ActiveEffect[];
  onClear?: (effectId: string) => void;
}) {
  if (!effects || effects.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {effects.map((fx) => (
        <Card key={fx.id} className="border-mana/40">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-mana">🔮 {fx.name}</p>
              <p className="text-sm text-parchment-200">{fx.description}</p>
              <p className="mt-1 text-[11px] text-parchment-300/70">
                {fx.source} · {timeAgo(fx.createdAt)}
                {fx.expiresAt ? ` · expires ${timeAgo(fx.expiresAt)}` : ''}
              </p>
            </div>
            {onClear && (
              <button
                onClick={() => onClear(fx.id)}
                className="flex-none rounded-lg bg-tavern-600 px-2.5 py-1 text-xs text-parchment-200 hover:bg-tavern-500"
              >
                Clear
              </button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
