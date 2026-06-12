/**
 * Battle result / history page.
 *   /battle/:id        -> a single battle's three-layer result
 *   /battle/history    -> completed battle history for the event
 *
 * Three outcome layers: Victory (real-world winner), Divine Favour (stat-roll
 * winner), and Glory (the same player won both).
 */
import { Link, useParams } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import { useBattleHistory, useSingleBattle } from '@/hooks/useBattle';
import { STAT_LABELS, formatModifier } from '@/lib/dice';
import { timeAgo } from '@/lib/utils';
import type { Battle, BattleRoll } from '@/types';
import { Badge, Button, Card, EmptyState, SectionTitle, Spinner } from '@/components/ui';

const STATUS_LABEL: Record<Battle['status'], string> = {
  pending: 'Waiting for the defender to accept',
  accepted: 'Accepted — do the challenge',
  declined: 'Challenge declined',
  inProgress: 'Challenge in progress',
  awaitingJudge: 'Waiting on the judge',
  awaitingRolls: 'Waiting on the stat rolls',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function BattleResultPage() {
  const { id } = useParams<{ id: string }>();

  if (id === 'history') return <HistoryView />;
  return <ResultView battleId={id} />;
}

function HistoryView() {
  const { eventId } = useEvent();
  const { battles, loading } = useBattleHistory(eventId);

  if (loading) return <Spinner />;
  return (
    <div className="flex flex-col gap-3">
      <SectionTitle
        right={<Link to="/battle" className="text-sm text-gold-300">← Battle</Link>}
      >
        Battle History
      </SectionTitle>
      {battles.length === 0 ? (
        <EmptyState emoji="⚔️" title="No battles yet" subtitle="Be the first to throw down." />
      ) : (
        battles.map((b) => <HistoryRow key={b.id} battle={b} />)
      )}
    </div>
  );
}

function ResultView({ battleId }: { battleId?: string }) {
  const { player } = usePlayer();
  const { battle, loading } = useSingleBattle(battleId);

  if (loading) return <Spinner />;
  if (!battle) {
    return (
      <EmptyState emoji="🤷" title="Battle not found" subtitle="It may have been cancelled." />
    );
  }

  if (battle.status !== 'completed') {
    return (
      <Card className="text-center">
        <p className="font-display text-xl text-parchment-100">⏳ {STATUS_LABEL[battle.status]}</p>
        <p className="mt-1 text-sm text-parchment-300">
          {battle.challengerName} vs {battle.defenderName} · {STAT_LABELS[battle.category]}
        </p>
        <Link to="/battle" className="mt-3 inline-block">
          <Button variant="secondary">Back to Battles</Button>
        </Link>
      </Card>
    );
  }

  const nameFor = (pid?: string) =>
    pid === battle.challengerId
      ? battle.challengerName
      : pid === battle.defenderId
        ? battle.defenderName
        : '—';

  const glory = !!battle.gloryWinnerId;
  const realWinnerName = nameFor(battle.realWorldWinnerId);
  const statWinnerName = nameFor(battle.statRollWinnerId);
  const xpAwarded = battle.gloryXpAwarded ?? battle.victoryXpAwarded ?? 0;
  const iWon = battle.realWorldWinnerId === player?.id;

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        <div className="text-6xl">{glory ? '👑' : iWon ? '🏆' : '⚔️'}</div>
        <h1 className="mt-2 font-display text-3xl gold-text">{realWinnerName} wins!</h1>
        <p className="mt-1 text-sm text-parchment-300">
          Battle of {STAT_LABELS[battle.category]} · "{battle.challenge.title}"
        </p>
        {glory && (
          <Badge className="mx-auto mt-2">
            👑 GLORY — {nameFor(battle.gloryWinnerId)} won the game AND the roll!
          </Badge>
        )}
        <p className="mt-2 text-sm text-gold-300">+{xpAwarded} XP to the victor</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Combatant
          name={battle.challengerName}
          roll={battle.challengerRoll}
          realWinner={battle.realWorldWinnerId === battle.challengerId}
          statWinner={battle.statRollWinnerId === battle.challengerId}
        />
        <Combatant
          name={battle.defenderName}
          roll={battle.defenderRoll}
          realWinner={battle.realWorldWinnerId === battle.defenderId}
          statWinner={battle.statRollWinnerId === battle.defenderId}
        />
      </div>

      {/* Divine Favour / stat-roll outcome */}
      <Card className="border-gold-400/40 bg-gold-500/10">
        <p className="text-sm text-parchment-100">
          🎲 <b>{statWinnerName}</b> won the stat roll and was favoured by the gods.
        </p>
        {battle.divineFavourTriggeredForPlayerId ? (
          <Link to="/divine" className="mt-2 inline-block">
            <Button variant="secondary">See the Divine Favour roll →</Button>
          </Link>
        ) : battle.statRollXpAwarded != null ? (
          <p className="mt-1 text-sm text-gold-300">+{battle.statRollXpAwarded} bonus XP</p>
        ) : null}
      </Card>

      <Link to="/battle">
        <Button fullWidth>Back to Battles</Button>
      </Link>
    </div>
  );
}

function Combatant({
  name,
  roll,
  realWinner,
  statWinner,
}: {
  name: string;
  roll?: BattleRoll;
  realWinner: boolean;
  statWinner: boolean;
}) {
  return (
    <Card className={realWinner ? 'border-gold-400 shadow-glow' : 'border-tavern-500 opacity-90'}>
      <p className="truncate font-display text-parchment-100">{name}</p>
      {roll ? (
        <>
          <p className="text-xs text-parchment-300">
            {STAT_LABELS[roll.attribute]} · d20 {roll.d20}
            {roll.attributeModifier ? ` ${formatModifier(roll.attributeModifier)}` : ''}
            {roll.activeModifier ? ` ${formatModifier(roll.activeModifier)} fx` : ''}
          </p>
          <p className="mt-2 font-display text-4xl text-gold-300">{roll.total}</p>
        </>
      ) : (
        <p className="mt-2 text-sm text-parchment-300">No roll</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {realWinner && <Badge>🏆 Winner</Badge>}
        {statWinner && <Badge color="#5b8fd6">🎲 Favoured</Badge>}
      </div>
    </Card>
  );
}

function HistoryRow({ battle }: { battle: Battle }) {
  const nameFor = (pid?: string) =>
    pid === battle.challengerId
      ? battle.challengerName
      : pid === battle.defenderId
        ? battle.defenderName
        : '—';
  return (
    <Link to={`/battle/${battle.id}`}>
      <Card className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm text-parchment-100">
            {battle.challengerName} vs {battle.defenderName}
          </p>
          <p className="truncate text-xs text-parchment-300">
            {STAT_LABELS[battle.category]} · {battle.challenge.title} · {timeAgo(battle.createdAt)}
          </p>
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          {battle.gloryWinnerId ? (
            <Badge>👑 {nameFor(battle.gloryWinnerId)}</Badge>
          ) : (
            <Badge>🏆 {nameFor(battle.realWorldWinnerId)}</Badge>
          )}
          {battle.statRollWinnerId &&
            battle.statRollWinnerId !== battle.realWorldWinnerId && (
              <span className="text-[10px] text-mana">🎲 {nameFor(battle.statRollWinnerId)}</span>
            )}
        </div>
      </Card>
    </Link>
  );
}
