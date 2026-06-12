/**
 * Global battle challenge popup.
 *
 * Mounted in the PlayerLayout so that wherever a player is in the app, an
 * incoming challenge forces a centre-screen choice:
 *   • Accept & Roll  → pick a stat, resolve the battle, go to the result
 *   • Decline        → challenger wins by forfeit, YOU get a debuff (punished)
 *
 * There is intentionally no "dismiss" — you must accept or decline.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useBattle } from '@/hooks/useBattle';
import { declineBattle, resolveBattle } from '@/services/battleService';
import { STAT_KEYS, STAT_LABELS, statModifier, formatModifier } from '@/lib/dice';
import type { StatKey } from '@/types';
import { Modal } from './Modal';
import { Button, Select } from './ui';

export function BattleChallengeModal() {
  const { player } = usePlayer();
  const { event, eventId } = useEvent();
  const { players } = useLeaderboard(eventId);
  const { incoming } = useBattle(eventId, player?.id);
  const navigate = useNavigate();
  const [stat, setStat] = useState<StatKey>('stamina');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show the oldest outstanding challenge first.
  const battle = incoming.length > 0 ? incoming[incoming.length - 1] : null;
  if (!battle || !player || !event) return null;

  const challenger = players.find((p) => p.id === battle.challengerId);

  async function accept() {
    if (!challenger || !player || !event) return;
    setError(null);
    setBusy(true);
    try {
      await resolveBattle(battle!, challenger, player, stat, event.settings);
      navigate(`/battle/${battle!.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    if (!challenger || !player || !event) return;
    setBusy(true);
    try {
      await declineBattle(battle!, player, challenger, event.settings);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal className="border-ember/70">
      <div className="text-center">
        <div className="text-5xl">⚔️</div>
        <h2 className="mt-2 font-display text-2xl gold-text">
          You've Been Challenged!
        </h2>
        <p className="mt-1 text-parchment-200">
          <b>{battle.challengerName}</b> challenges you to a duel of{' '}
          <span className="text-gold-300">
            {STAT_LABELS[battle.challengerStat]}
          </span>
          .
        </p>
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-sm text-parchment-200">
          Counter with your stat
        </label>
        <Select value={stat} onChange={(e) => setStat(e.target.value as StatKey)}>
          {STAT_KEYS.map((k) => (
            <option key={k} value={k}>
              {STAT_LABELS[k]} ({formatModifier(statModifier(player.stats[k]))})
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="mt-3 text-center text-sm text-ember">{error}</p>}

      <div className="mt-5 flex flex-col gap-2">
        <Button fullWidth disabled={busy} onClick={accept}>
          {busy ? 'Rolling…' : 'Accept & Roll 🎲'}
        </Button>
        <Button variant="danger" fullWidth disabled={busy} onClick={decline}>
          🐔 Decline (and be punished)
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-parchment-300/70">
        Decline and your rival wins by forfeit — plus you'll cop a debuff.
      </p>
    </Modal>
  );
}
