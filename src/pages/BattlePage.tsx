/**
 * Battle page — the hybrid party-game + stat-roll battle hub.
 *
 * Real night flow:
 *   1. Accept the challenge (the party game is revealed only once accepted).
 *   2. Do the challenge shown on the card.
 *   3. The Game Master records the real-world winner.
 *   4. Both players roll their stat (d20 + attribute modifier).
 *   5. The gods interfere (Divine Favour for the stat-roll winner).
 *   6. XP & Glory are awarded automatically.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useBattles } from '@/hooks/useBattle';
import {
  acceptBattle,
  battleCooldownRemaining,
  cancelBattle,
  createBattle,
  declineBattle,
  recordRealWorldWinner,
  submitBattleRoll,
} from '@/services/battleService';
import { STAT_KEYS, STAT_LABELS, formatModifier } from '@/lib/dice';
import { getAttributeModifier } from '@/lib/battleUtils';
import { classEmoji } from '@/lib/classes';
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

export default function BattlePage() {
  const { player, loading } = usePlayer();
  const { event, eventId, isAdmin } = useEvent();
  const { players } = useLeaderboard(eventId);
  const { incoming, active, mine } = useBattles(eventId, player?.id);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const cooldownMs = useMemo(
    () =>
      player && event
        ? battleCooldownRemaining(
            player,
            event.settings.battleSettings?.cooldownMinutesBetweenBattles ?? 0,
          )
        : 0,
    [player, event],
  );

  if (loading || !player || !event) return <Spinner />;

  if (!player.hasRolled) {
    return (
      <EmptyState
        emoji="🎲"
        title="Roll your stats first"
        subtitle="You need a character sheet before you can battle."
      />
    );
  }

  const opponents = players.filter((p) => p.id !== player.id && p.hasRolled);
  const recentResults = mine
    .filter((b) => b.status === 'completed')
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      {error && <Card className="border-ember/50 text-ember">{error}</Card>}

      {/* Incoming challenges */}
      {incoming.length > 0 && (
        <div>
          <SectionTitle>⚔️ Incoming Challenges</SectionTitle>
          <div className="flex flex-col gap-3">
            {incoming.map((b) => (
              <IncomingCard
                key={b.id}
                battle={b}
                allowDecline={event.settings.battleSettings?.allowDecline ?? true}
                onAccept={() => guard(() => acceptBattle(b.id))}
                onDecline={() => guard(() => declineBattle(b.id))}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active battles needing action */}
      {active.length > 0 && (
        <div>
          <SectionTitle>🥊 Active Battles</SectionTitle>
          <div className="flex flex-col gap-3">
            {active.map((b) => (
              <ActiveBattleCard
                key={b.id}
                battle={b}
                me={player}
                canJudge={isAdmin}
                onRoll={() => guard(() => submitBattleRoll(b.id, player.id))}
                onRecordWinner={(winnerId) =>
                  guard(() => recordRealWorldWinner(b.id, winnerId))
                }
                onCancel={() => guard(() => cancelBattle(b.id))}
                onViewResult={() => navigate(`/battle/${b.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recently completed (mine) */}
      {recentResults.length > 0 && (
        <div>
          <SectionTitle>Recent Results</SectionTitle>
          <div className="flex flex-col gap-2">
            {recentResults.map((b) => (
              <Card
                key={b.id}
                className="flex items-center justify-between gap-2"
                onClick={() => navigate(`/battle/${b.id}`)}
              >
                <span className="truncate text-sm text-parchment-100">
                  {STAT_LABELS[b.category]}: {b.challengerName} vs {b.defenderName}
                </span>
                <Badge>View →</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* New challenge */}
      <div>
        <SectionTitle>Challenge a Rival</SectionTitle>
        {!(event.settings.battleSettings?.allowPlayerIssuedChallenges ?? true) &&
          !isAdmin ? (
          <EmptyState
            emoji="🛡️"
            title="Challenges are GM-only"
            subtitle="The Game Master starts battles for this event."
          />
        ) : cooldownMs > 0 ? (
          <Card className="mb-3 border-ember/40 text-sm text-parchment-200">
            ⏳ On cooldown — wait {Math.ceil(cooldownMs / 60_000)} min before your
            next challenge.
          </Card>
        ) : opponents.length === 0 ? (
          <EmptyState
            emoji="🫥"
            title="No rivals yet"
            subtitle="Nobody else has rolled their stats. Round them up!"
          />
        ) : (
          <CreateChallengeCard
            me={player}
            opponents={opponents}
            onCreate={async (defender, category) => {
              setError(null);
              try {
                await createBattle({
                  eventId: event.id,
                  challenger: player,
                  defender,
                  category,
                });
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          />
        )}
      </div>

      <Button variant="secondary" fullWidth onClick={() => navigate('/battle/history')}>
        📜 View Battle History
      </Button>
    </div>
  );

  function guard(fn: () => Promise<unknown>) {
    setError(null);
    fn().catch((e) => setError((e as Error).message));
  }
}

// ---- Incoming challenge -----------------------------------------------------
// The specific party game stays hidden until the challenge is accepted.
function IncomingCard({
  battle,
  allowDecline,
  onAccept,
  onDecline,
}: {
  battle: Battle;
  allowDecline: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Card className="border-gold-400/40">
      <p className="text-parchment-100">
        <b>{battle.challengerName}</b> challenges you to a{' '}
        <span className="text-gold-300">Battle of {STAT_LABELS[battle.category]}</span>!
      </p>
      <p className="mt-1 text-xs text-parchment-300/70">
        🎲 The challenge is revealed once you accept.
      </p>
      <div className="mt-3 flex gap-2">
        <Button fullWidth onClick={onAccept}>
          Accept ⚔️
        </Button>
        {allowDecline && (
          <Button variant="ghost" onClick={onDecline}>
            Decline
          </Button>
        )}
      </div>
    </Card>
  );
}

// ---- Active battle ----------------------------------------------------------
function ActiveBattleCard({
  battle,
  me,
  canJudge,
  onRoll,
  onRecordWinner,
  onCancel,
  onViewResult,
}: {
  battle: Battle;
  me: Player;
  canJudge: boolean;
  onRoll: () => void;
  onRecordWinner: (winnerId: string) => void;
  onCancel: () => void;
  onViewResult: () => void;
}) {
  const iAmChallenger = battle.challengerId === me.id;
  const myRoll = iAmChallenger ? battle.challengerRoll : battle.defenderRoll;
  const otherName = iAmChallenger ? battle.defenderName : battle.challengerName;
  const accepted = battle.status !== 'pending';

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-parchment-100">
          {battle.challengerName} vs {battle.defenderName}
        </p>
        <Badge>{STAT_LABELS[battle.category]}</Badge>
      </div>

      {/* The party game is only revealed once the battle is accepted. */}
      {accepted && <ChallengeBlurb battle={battle} />}

      {/* Pending — waiting on the defender; challenge stays hidden */}
      {battle.status === 'pending' && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-parchment-300">
            Waiting for {battle.defenderName} to accept…
          </span>
          {iAmChallenger && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* In progress — do the party game, GM records winner */}
      {(battle.status === 'accepted' ||
        battle.status === 'inProgress' ||
        battle.status === 'awaitingJudge') && (
        <div className="mt-3">
          <p className="text-sm text-parchment-200">
            🎮 Do the challenge! Then the Game Master records the winner.
          </p>
          {canJudge ? (
            <div className="mt-2">
              <Label>Record the real-world winner</Label>
              <div className="flex gap-2">
                <Button fullWidth variant="secondary" onClick={() => onRecordWinner(battle.challengerId)}>
                  🏆 {battle.challengerName}
                </Button>
                <Button fullWidth variant="secondary" onClick={() => onRecordWinner(battle.defenderId)}>
                  🏆 {battle.defenderName}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-parchment-300/70">
              Waiting for the Game Master to record the winner.
            </p>
          )}
        </div>
      )}

      {/* Awaiting rolls — both players roll their stat */}
      {battle.status === 'awaitingRolls' && (
        <div className="mt-3">
          <p className="text-sm text-parchment-200">
            🎲 Real-world winner recorded. Now roll your stat!
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-parchment-300">
            <span>
              You: {myRoll ? `rolled ${myRoll.total}` : 'not rolled'}
            </span>
            <span>
              {otherName}:{' '}
              {(iAmChallenger ? battle.defenderRoll : battle.challengerRoll)
                ? 'rolled'
                : 'waiting'}
            </span>
          </div>
          {!myRoll ? (
            <Button fullWidth className="mt-2" onClick={onRoll}>
              🎲 Roll {STAT_LABELS[battle.category]} (d20{' '}
              {formatModifier(getAttributeModifier(me.stats[battle.category]))})
            </Button>
          ) : (
            <p className="mt-2 text-center text-sm text-gold-300">
              Rolled {myRoll.total} — waiting on {otherName}…
            </p>
          )}
        </div>
      )}

      <button
        onClick={onViewResult}
        className="mt-3 text-xs text-parchment-300/60 underline"
      >
        battle details →
      </button>
    </Card>
  );
}

function ChallengeBlurb({ battle }: { battle: Battle }) {
  return (
    <div className="mt-2 rounded-lg bg-tavern-800/60 p-2.5">
      <p className="text-sm font-semibold text-gold-300">🎯 {battle.challenge.title}</p>
      <p className="text-sm text-parchment-200">{battle.challenge.instructions}</p>
      {battle.challenge.suggestedDurationMinutes && (
        <p className="mt-1 text-[11px] text-parchment-300/70">
          ~{battle.challenge.suggestedDurationMinutes} min
        </p>
      )}
    </div>
  );
}

// ---- Create challenge -------------------------------------------------------
// Pick an opponent and a category; the party game itself is drawn at random and
// hidden until the defender accepts.
function CreateChallengeCard({
  me,
  opponents,
  onCreate,
}: {
  me: Player;
  opponents: Player[];
  onCreate: (defender: Player, category: AttributeKey) => Promise<void>;
}) {
  const [defenderId, setDefenderId] = useState(opponents[0]?.id ?? '');
  const [category, setCategory] = useState<AttributeKey>('rizz');
  const [busy, setBusy] = useState(false);

  const defender = opponents.find((o) => o.id === defenderId);

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Label>Opponent</Label>
        <Select value={defenderId} onChange={(e) => setDefenderId(e.target.value)}>
          {opponents.map((o) => (
            <option key={o.id} value={o.id}>
              {classEmoji(o.className)} {o.name} (Lv {o.level})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Battle category</Label>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as AttributeKey)}
        >
          {STAT_KEYS.map((k) => (
            <option key={k} value={k}>
              {STAT_LABELS[k]} ({formatModifier(getAttributeModifier(me.stats[k]))})
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-parchment-300/70">
          🎲 A random {STAT_LABELS[category]} challenge is drawn and revealed once
          your rival accepts.
        </p>
      </div>

      <Button
        fullWidth
        disabled={busy || !defender}
        onClick={async () => {
          if (!defender) return;
          setBusy(true);
          try {
            await onCreate(defender, category);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Sending…' : 'Issue Challenge ⚔️'}
      </Button>
    </Card>
  );
}
