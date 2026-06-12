/**
 * Admin: battle control — create battles, record/override the real-world
 * winner, force stat rolls, complete, cancel, delete, and trigger Divine Favour.
 */
import { useState } from 'react';
import { useEvent } from '@/hooks/useEvent';
import { useBattles } from '@/hooks/useBattle';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import {
  adminForceRolls,
  adminTriggerDivineFavour,
  cancelBattle,
  completeBattle,
  createBattle,
  deleteBattle,
  recordRealWorldWinner,
} from '@/services/battleService';
import { STAT_KEYS, STAT_LABELS } from '@/lib/dice';
import { timeAgo } from '@/lib/utils';
import type { AttributeKey, Battle, Player } from '@/types';
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

export default function AdminBattles() {
  const { event, eventId } = useEvent();
  const { battles, loading } = useBattles(eventId);
  const { players } = useLeaderboard(eventId);
  const [error, setError] = useState<string | null>(null);

  if (loading || !event) return <Spinner />;

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    fn().catch((e) => setError((e as Error).message));
  };
  const nameFor = (pid?: string) => players.find((p) => p.id === pid)?.name ?? '—';

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>⚔️ Battles ({battles.length})</SectionTitle>
      {error && <Card className="border-ember/50 text-ember">{error}</Card>}

      <ManualCreate
        players={players.filter((p) => p.hasRolled)}
        onCreate={(challenger, defender, category) =>
          run(() =>
            createBattle({
              eventId: event.id,
              challenger,
              defender,
              category,
              judgeMode: 'admin',
              byAdmin: true,
            }),
          )
        }
      />

      {battles.length === 0 ? (
        <EmptyState emoji="⚔️" title="No battles yet" />
      ) : (
        battles.map((b) => (
          <AdminBattleCard
            key={b.id}
            battle={b}
            nameFor={nameFor}
            onRecordWinner={(winnerId) => run(() => recordRealWorldWinner(b.id, winnerId))}
            onForceRolls={() => run(() => adminForceRolls(b.id))}
            onComplete={() => run(() => completeBattle(b.id))}
            onCancel={() => run(() => cancelBattle(b.id))}
            onDelete={() => run(() => deleteBattle(b.id))}
            onTriggerDF={(pid) => run(() => adminTriggerDivineFavour(b.id, pid))}
          />
        ))
      )}
    </div>
  );
}

function ManualCreate({
  players,
  onCreate,
}: {
  players: Player[];
  onCreate: (challenger: Player, defender: Player, category: AttributeKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [aId, setAId] = useState(players[0]?.id ?? '');
  const [bId, setBId] = useState(players[1]?.id ?? '');
  const [category, setCategory] = useState<AttributeKey>('rizz');

  const a = players.find((p) => p.id === aId);
  const b = players.find((p) => p.id === bId);

  return (
    <Card className="flex flex-col gap-3">
      <Button variant="secondary" fullWidth onClick={() => setOpen((v) => !v)}>
        {open ? '× Close' : '+ Create Battle Manually'}
      </Button>
      {open && (
        <>
          <div>
            <Label>Challenger</Label>
            <Select value={aId} onChange={(e) => setAId(e.target.value)}>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Defender</Label>
            <Select value={bId} onChange={(e) => setBId(e.target.value)}>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value as AttributeKey)}>
              {STAT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {STAT_LABELS[k]}
                </option>
              ))}
            </Select>
          </div>
          <Button
            fullWidth
            disabled={!a || !b || aId === bId}
            onClick={() => a && b && onCreate(a, b, category)}
          >
            Create Battle
          </Button>
        </>
      )}
    </Card>
  );
}

function AdminBattleCard({
  battle,
  nameFor,
  onRecordWinner,
  onForceRolls,
  onComplete,
  onCancel,
  onDelete,
  onTriggerDF,
}: {
  battle: Battle;
  nameFor: (pid?: string) => string;
  onRecordWinner: (winnerId: string) => void;
  onForceRolls: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onTriggerDF: (pid: string) => void;
}) {
  const terminal = ['completed', 'cancelled', 'declined'].includes(battle.status);
  const bothRolled = !!battle.challengerRoll && !!battle.defenderRoll;

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm text-parchment-100">
          {battle.challengerName} vs {battle.defenderName}{' '}
          <span className="text-parchment-300">({STAT_LABELS[battle.category]})</span>
        </p>
        <Badge color={terminal ? '#999' : undefined}>{battle.status}</Badge>
      </div>
      <p className="text-xs text-parchment-300">
        🎯 {battle.challenge.title} · {timeAgo(battle.createdAt)}
      </p>

      {battle.status === 'completed' && (
        <p className="text-xs text-gold-300">
          🏆 {nameFor(battle.realWorldWinnerId)}
          {battle.gloryWinnerId ? ' · 👑 GLORY' : ''} · 🎲{' '}
          {nameFor(battle.statRollWinnerId)}
        </p>
      )}

      {!terminal && (
        <>
          <div>
            <Label>Record / override real-world winner</Label>
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => onRecordWinner(battle.challengerId)}>
                {battle.challengerName}
              </Button>
              <Button variant="secondary" fullWidth onClick={() => onRecordWinner(battle.defenderId)}>
                {battle.defenderName}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="text-xs" onClick={onForceRolls}>
              🎲 Force rolls
            </Button>
            {battle.realWorldWinnerId && bothRolled && (
              <Button variant="ghost" className="text-xs" onClick={onComplete}>
                ✅ Complete
              </Button>
            )}
            <Button variant="ghost" className="text-xs text-ember" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2 border-t border-gold-600/20 pt-2">
        <Button variant="ghost" className="text-xs" onClick={() => onTriggerDF(battle.challengerId)}>
          🎲 DF: {battle.challengerName}
        </Button>
        <Button variant="ghost" className="text-xs" onClick={() => onTriggerDF(battle.defenderId)}>
          🎲 DF: {battle.defenderName}
        </Button>
        <Button variant="ghost" className="text-xs text-ember" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
