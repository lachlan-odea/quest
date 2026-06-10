/**
 * Join page — enter a join code, find the event, and hop in.
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { getEventByJoinCode } from '@/services/eventService';
import { getPlayerForAuth } from '@/services/playerService';
import { Button, Card, Input, Label } from '@/components/ui';

export default function JoinPage() {
  const { joinEventById, user } = useGame();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const event = await getEventByJoinCode(code);
      if (!event) {
        setError("No event found with that code. Check it and try again.");
        return;
      }
      joinEventById(event.id);

      // If this device already has a player in the event, go to the sheet.
      const existing = user
        ? await getPlayerForAuth(event.id, user.uid)
        : null;
      navigate(existing ? '/sheet' : '/setup', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <div className="text-5xl">🎟️</div>
        <h1 className="mt-2 font-display text-3xl gold-text">Join the Party</h1>
        <p className="mt-1 text-parchment-300">
          Enter the join code from your Game Master.
        </p>
      </div>

      <Card>
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div>
            <Label>Join code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC23"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={6}
              className="text-center font-display text-2xl tracking-[0.4em]"
            />
          </div>
          {error && <p className="text-sm text-ember">{error}</p>}
          <Button type="submit" fullWidth disabled={busy || code.length < 4}>
            {busy ? 'Finding…' : 'Enter'}
          </Button>
        </form>
      </Card>

      <Link to="/" className="text-center text-sm text-parchment-300/70">
        ← Back
      </Link>
    </div>
  );
}
