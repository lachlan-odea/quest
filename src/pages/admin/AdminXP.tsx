/**
 * Admin: XP controls — award or remove XP from any player with quick buttons
 * or a custom amount.
 */
import { useState } from 'react';
import { useEvent } from '@/hooks/useEvent';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { awardXp } from '@/services/playerService';
import { classEmoji } from '@/lib/classes';
import type { Player } from '@/types';
import { Badge, Button, Card, EmptyState, Input, SectionTitle, Spinner } from '@/components/ui';

const QUICK = [25, 50, 100];

export default function AdminXP() {
  const { event, eventId } = useEvent();
  const { players, loading } = useLeaderboard(eventId);

  if (loading || !event) return <Spinner />;

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Award XP</SectionTitle>
      <p className="-mt-2 text-sm text-parchment-300">
        Hand out bonus XP for good behaviour (or take it back for bad).
      </p>
      {players.length === 0 ? (
        <EmptyState emoji="⭐" title="No players yet" />
      ) : (
        players.map((p) => (
          <XpRow key={p.id} player={p} xpPerLevel={event.settings.xpPerLevel} />
        ))
      )}
    </div>
  );
}

function XpRow({ player, xpPerLevel }: { player: Player; xpPerLevel: number }) {
  const [custom, setCustom] = useState('');

  function give(amount: number) {
    if (amount === 0) return;
    awardXp(player, amount, xpPerLevel, 'GM adjustment');
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{classEmoji(player.className)}</span>
          <div>
            <p className="font-display text-parchment-100">{player.name}</p>
            <p className="text-xs text-parchment-300">Lv {player.level}</p>
          </div>
        </div>
        <Badge>{player.xp} XP</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK.map((n) => (
          <Button key={n} variant="secondary" className="flex-1 px-2 py-2 text-sm" onClick={() => give(n)}>
            +{n}
          </Button>
        ))}
        {QUICK.map((n) => (
          <Button
            key={`m${n}`}
            variant="ghost"
            className="flex-1 px-2 py-2 text-sm text-ember"
            onClick={() => give(-n)}
          >
            −{n}
          </Button>
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^\d-]/g, ''))}
          placeholder="Custom (e.g. 150 or -75)"
          inputMode="numeric"
        />
        <Button
          className="px-4"
          onClick={() => {
            give(Number(custom) || 0);
            setCustom('');
          }}
        >
          Apply
        </Button>
      </div>
    </Card>
  );
}
