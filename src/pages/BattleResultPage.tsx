/**
 * Battle result / history page.
 *   /battle/:id        -> a single battle's dramatic result
 *   /battle/history    -> full battle history for the event
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import { useBattle } from '@/hooks/useBattle';
import { rollDivineFavour } from '@/services/divineFavourService';
import { STAT_LABELS } from '@/lib/dice';
import { timeAgo } from '@/lib/utils';
import type { Battle, DivineFavourMode } from '@/types';
import { Badge, Button, Card, EmptyState, SectionTitle, Spinner } from '@/components/ui';

/** Who may roll Divine Favour after a battle, per the event setting. */
function canRollAfterBattle(
  mode: DivineFavourMode,
  battle: Battle,
  playerId: string | undefined,
): boolean {
  if (!playerId) return false;
  const isParticipant =
    battle.challengerId === playerId || battle.defenderId === playerId;
  if (!isParticipant) return false;
  switch (mode) {
    case 'winnerOnly':
      return battle.winnerId === playerId;
    case 'bothPlayers':
      return true;
    case 'adminTriggered':
    case 'disabled':
    default:
      return false;
  }
}

export default function BattleResultPage() {
  const { id } = useParams<{ id: string }>();
  const { player } = usePlayer();
  const { event, eventId } = useEvent();
  const { battles, loading } = useBattle(eventId, player?.id);

  if (loading) return <Spinner />;

  if (id === 'history') {
    return (
      <div className="flex flex-col gap-3">
        <SectionTitle right={<Link to="/battle" className="text-sm text-gold-300">← Battle</Link>}>
          Battle History
        </SectionTitle>
        {battles.length === 0 ? (
          <EmptyState emoji="⚔️" title="No battles yet" subtitle="Be the first to throw down." />
        ) : (
          battles.map((b) => <BattleRow key={b.id} battle={b} />)
        )}
      </div>
    );
  }

  const battle = battles.find((b) => b.id === id);
  if (!battle) {
    return (
      <EmptyState
        emoji="🤷"
        title="Battle not found"
        subtitle="It may still be pending or was cancelled."
      />
    );
  }

  if (battle.status !== 'completed') {
    return (
      <Card className="text-center">
        <p className="font-display text-xl text-parchment-100">
          ⏳ Battle pending…
        </p>
        <p className="mt-1 text-sm text-parchment-300">
          Waiting on {battle.defenderName} to accept.
        </p>
        <Link to="/battle" className="mt-3 inline-block">
          <Button variant="secondary">Back to Battles</Button>
        </Link>
      </Card>
    );
  }

  const youWon = battle.winnerId === player?.id;
  const winnerName =
    battle.winnerId === battle.challengerId
      ? battle.challengerName
      : battle.defenderName;

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        <div className="text-6xl">{youWon ? '🏆' : '⚔️'}</div>
        <h1 className="mt-2 font-display text-3xl gold-text">
          {winnerName} wins!
        </h1>
        <p className="mt-1 text-sm text-parchment-300">
          +{battle.xpReward} XP to the victor
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Combatant
          name={battle.challengerName}
          stat={STAT_LABELS[battle.challengerStat]}
          roll={battle.challengerRoll}
          total={battle.challengerTotal}
          winner={battle.winnerId === battle.challengerId}
        />
        <Combatant
          name={battle.defenderName}
          stat={battle.defenderStat ? STAT_LABELS[battle.defenderStat] : '—'}
          roll={battle.defenderRoll}
          total={battle.defenderTotal}
          winner={battle.winnerId === battle.defenderId}
        />
      </div>

      {event && (
        <PostBattleDivineFavour
          mode={event.settings.divineFavourMode ?? 'winnerOnly'}
          battle={battle}
          eventId={eventId}
          playerId={player?.id}
        />
      )}

      <Link to="/battle">
        <Button fullWidth>Back to Battles</Button>
      </Link>
    </div>
  );
}

/** Offers a Divine Favour roll to eligible players after a battle. */
function PostBattleDivineFavour({
  mode,
  battle,
  eventId,
  playerId,
}: {
  mode: DivineFavourMode;
  battle: Battle;
  eventId: string | null;
  playerId: string | undefined;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (mode === 'adminTriggered') {
    return (
      <Card className="text-center text-sm text-parchment-300">
        🎲 Divine Favour is triggered by the Game Master.
      </Card>
    );
  }
  if (!canRollAfterBattle(mode, battle, playerId) || !eventId || !playerId) {
    return null;
  }

  return (
    <Card className="border-gold-400/50 bg-gold-500/10 text-center">
      <p className="font-display text-gold-300">🎲 The gods are watching…</p>
      <p className="mb-3 text-xs text-parchment-300">
        {mode === 'winnerOnly'
          ? 'To the victor: roll on the Table of Divine Favour!'
          : 'Both combatants may roll on the Table of Divine Favour.'}
      </p>
      <Button
        fullWidth
        disabled={busy || done}
        onClick={async () => {
          setBusy(true);
          try {
            await rollDivineFavour(eventId, playerId);
            setDone(true);
            navigate('/divine');
          } finally {
            setBusy(false);
          }
        }}
      >
        {done ? 'Rolled ✓' : busy ? 'Rolling…' : 'Roll Divine Favour'}
      </Button>
    </Card>
  );
}

function Combatant({
  name,
  stat,
  roll,
  total,
  winner,
}: {
  name: string;
  stat: string;
  roll: number | null;
  total: number | null;
  winner: boolean;
}) {
  return (
    <Card
      className={winner ? 'border-gold-400 shadow-glow' : 'border-tavern-500 opacity-80'}
    >
      <p className="truncate font-display text-parchment-100">{name}</p>
      <p className="text-xs text-parchment-300">{stat}</p>
      <p className="mt-2 font-display text-4xl text-gold-300">{total ?? '—'}</p>
      <p className="text-xs text-parchment-300">d20 roll: {roll ?? '—'}</p>
      {winner && <Badge className="mt-2">Winner</Badge>}
    </Card>
  );
}

function BattleRow({ battle }: { battle: Battle }) {
  const completed = battle.status === 'completed';
  const winnerName =
    battle.winnerId === battle.challengerId
      ? battle.challengerName
      : battle.defenderName;
  return (
    <Card className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-parchment-100">
          {battle.challengerName} vs {battle.defenderName}
        </p>
        <p className="text-xs text-parchment-300">{timeAgo(battle.createdAt)}</p>
      </div>
      {completed ? (
        <Badge>🏆 {winnerName}</Badge>
      ) : (
        <Badge color="#999">{battle.status}</Badge>
      )}
    </Card>
  );
}
