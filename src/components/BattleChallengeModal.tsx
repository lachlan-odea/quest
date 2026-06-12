/**
 * Global incoming-challenge popup.
 *
 * Mounted in the PlayerLayout so an incoming challenge forces a centre-screen
 * choice wherever the player is:
 *   • Accept  → battle moves to in-progress; go do the party game
 *   • Decline → challenge is declined (unless a curse forces acceptance)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import { useBattles } from '@/hooks/useBattle';
import { acceptBattle, declineBattle } from '@/services/battleService';
import { STAT_LABELS } from '@/lib/dice';
import { Modal } from './Modal';
import { Button } from './ui';

export function BattleChallengeModal() {
  const { player } = usePlayer();
  const { event, eventId } = useEvent();
  const { incoming } = useBattles(eventId, player?.id);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show the oldest outstanding challenge first.
  const battle = incoming.length > 0 ? incoming[incoming.length - 1] : null;
  if (!battle || !player || !event) return null;

  const allowDecline = event.settings.battleSettings?.allowDecline ?? true;

  async function accept() {
    setError(null);
    setBusy(true);
    try {
      await acceptBattle(battle!.id);
      navigate('/battle');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    setError(null);
    setBusy(true);
    try {
      await declineBattle(battle!.id);
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
        <h2 className="mt-2 font-display text-2xl gold-text">You've Been Challenged!</h2>
        <p className="mt-1 text-parchment-200">
          <b>{battle.challengerName}</b> challenges you to a{' '}
          <span className="text-gold-300">Battle of {STAT_LABELS[battle.category]}</span>.
        </p>
      </div>

      <p className="mt-3 text-center text-xs text-parchment-300/70">
        🎲 The challenge is revealed once you accept.
      </p>

      {error && <p className="mt-3 text-center text-sm text-ember">{error}</p>}

      <div className="mt-5 flex flex-col gap-2">
        <Button fullWidth disabled={busy} onClick={accept}>
          {busy ? 'One sec…' : 'Accept ⚔️'}
        </Button>
        {allowDecline && (
          <Button variant="ghost" fullWidth disabled={busy} onClick={decline}>
            Decline
          </Button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-parchment-300/70">
        Accept, do the party game, then roll — the gods are watching. 🎲
      </p>
    </Modal>
  );
}
