/**
 * Battle page — challenge another player and respond to incoming challenges.
 *
 * Flow:
 *   1. Challenger picks an opponent + a stat → creates a pending battle.
 *   2. Defender sees the challenge, picks their stat → battle resolves
 *      (d20 + modifier each, higher wins). Winner gets XP, loser gets a debuff.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useBattle } from '@/hooks/useBattle';
import {
  battleCooldownRemaining,
  cancelBattle,
  createChallenge,
  resolveBattle,
} from '@/services/battleService';
import { STAT_KEYS, STAT_LABELS, STAT_BLURBS, statModifier, formatModifier } from '@/lib/dice';
import { classEmoji } from '@/lib/classes';
import type { Player, StatKey } from '@/types';
import {
  Button,
  Card,
  EmptyState,
  SectionTitle,
  Select,
  Spinner,
} from '@/components/ui';

export default function BattlePage() {
  const { player, loading } = usePlayer();
  const { event, eventId } = useEvent();
  const { players } = useLeaderboard(eventId);
  const { incoming, mine } = useBattle(eventId, player?.id);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const cooldownMs = useMemo(
    () =>
      player && event
        ? battleCooldownRemaining(player, event.settings.battleCooldownSeconds)
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

  const opponents = players.filter(
    (p) => p.id !== player.id && p.hasRolled,
  );
  const pendingByMe = mine.filter(
    (b) => b.status === 'pending' && b.challengerId === player.id,
  );

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <Card className="border-ember/50 text-ember">{error}</Card>
      )}

      {/* Incoming challenges */}
      {incoming.length > 0 && (
        <div>
          <SectionTitle>⚔️ Incoming Challenges</SectionTitle>
          <div className="flex flex-col gap-3">
            {incoming.map((b) => {
              const challenger = players.find((p) => p.id === b.challengerId);
              return (
                <RespondCard
                  key={b.id}
                  challengerName={b.challengerName}
                  challengerStat={b.challengerStat}
                  onAccept={async (defenderStat) => {
                    if (!challenger) return;
                    setError(null);
                    try {
                      await resolveBattle(
                        b,
                        challenger,
                        player,
                        defenderStat,
                        event.settings,
                      );
                      navigate(`/battle/${b.id}`);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                  onDecline={() => cancelBattle(b)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Challenges I've sent (waiting) */}
      {pendingByMe.length > 0 && (
        <div>
          <SectionTitle>Awaiting Response</SectionTitle>
          <div className="flex flex-col gap-2">
            {pendingByMe.map((b) => (
              <Card key={b.id} className="flex items-center justify-between">
                <span className="text-sm text-parchment-200">
                  You challenged <b>{b.defenderName}</b> ({STAT_LABELS[b.challengerStat]})
                </span>
                <Button variant="ghost" onClick={() => cancelBattle(b)}>
                  Cancel
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* New challenge */}
      <div>
        <SectionTitle>Challenge a Rival</SectionTitle>
        {cooldownMs > 0 && (
          <Card className="mb-3 border-ember/40 text-sm text-parchment-200">
            ⏳ On cooldown — wait {Math.ceil(cooldownMs / 1000)}s before your
            next challenge. (Anti-spam guardrail.)
          </Card>
        )}
        {opponents.length === 0 ? (
          <EmptyState
            emoji="🫥"
            title="No rivals yet"
            subtitle="Nobody else has rolled their stats. Round them up!"
          />
        ) : (
          <ChallengeForm
            me={player}
            opponents={opponents}
            disabled={cooldownMs > 0}
            onChallenge={async (defender, stat) => {
              setError(null);
              try {
                await createChallenge({
                  event,
                  challenger: player,
                  defender,
                  challengerStat: stat,
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
}

// ---- Challenge form ---------------------------------------------------------
function ChallengeForm({
  me,
  opponents,
  disabled,
  onChallenge,
}: {
  me: Player;
  opponents: Player[];
  disabled: boolean;
  onChallenge: (defender: Player, stat: StatKey) => Promise<void>;
}) {
  const [defenderId, setDefenderId] = useState(opponents[0]?.id ?? '');
  const [stat, setStat] = useState<StatKey>('charisma');
  const [busy, setBusy] = useState(false);

  const defender = opponents.find((o) => o.id === defenderId);

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <label className="mb-1.5 block text-sm text-parchment-200">Opponent</label>
        <Select
          value={defenderId}
          onChange={(e) => setDefenderId(e.target.value)}
        >
          {opponents.map((o) => (
            <option key={o.id} value={o.id}>
              {classEmoji(o.className)} {o.name} (Lv {o.level})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-parchment-200">
          Your weapon (stat)
        </label>
        <Select value={stat} onChange={(e) => setStat(e.target.value as StatKey)}>
          {STAT_KEYS.map((k) => (
            <option key={k} value={k}>
              {STAT_LABELS[k]} ({formatModifier(statModifier(me.stats[k]))})
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-parchment-300/70">{STAT_BLURBS[stat]}</p>
      </div>

      <Button
        fullWidth
        disabled={disabled || busy || !defender}
        onClick={async () => {
          if (!defender) return;
          setBusy(true);
          try {
            await onChallenge(defender, stat);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Sending…' : `Throw Down the Gauntlet ⚔️`}
      </Button>
    </Card>
  );
}

// ---- Respond to an incoming challenge --------------------------------------
function RespondCard({
  challengerName,
  challengerStat,
  onAccept,
  onDecline,
}: {
  challengerName: string;
  challengerStat: StatKey;
  onAccept: (stat: StatKey) => Promise<void>;
  onDecline: () => void;
}) {
  const [stat, setStat] = useState<StatKey>('strength');
  const [busy, setBusy] = useState(false);

  return (
    <Card className="border-gold-400/40">
      <p className="text-parchment-100">
        <b>{challengerName}</b> challenges you with{' '}
        <span className="text-gold-300">{STAT_LABELS[challengerStat]}</span>!
      </p>
      <label className="mb-1.5 mt-3 block text-sm text-parchment-200">
        Counter with your stat
      </label>
      <Select value={stat} onChange={(e) => setStat(e.target.value as StatKey)}>
        {STAT_KEYS.map((k) => (
          <option key={k} value={k}>
            {STAT_LABELS[k]}
          </option>
        ))}
      </Select>
      <div className="mt-3 flex gap-2">
        <Button
          fullWidth
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onAccept(stat);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Rolling…' : 'Accept & Roll 🎲'}
        </Button>
        <Button variant="ghost" onClick={onDecline}>
          Decline
        </Button>
      </div>
    </Card>
  );
}
