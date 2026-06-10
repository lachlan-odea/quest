/**
 * Admin login — verify the event's admin PIN, then enter admin mode.
 * (See firestore.rules + README for the security model & how to harden it.)
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { elevateToAdmin } from '@/services/eventService';
import { Button, Card, Input, Label } from '@/components/ui';

export default function AdminLoginPage() {
  const { eventId, user, enterAdminMode, event } = useGame();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !user) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await elevateToAdmin(eventId, pin, user.uid);
      if (!ok) {
        setError('Incorrect PIN.');
        return;
      }
      enterAdminMode();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!eventId) {
    return (
      <div className="mx-auto max-w-md px-6 py-10 text-center">
        <p className="text-parchment-200">Join an event first.</p>
        <Link to="/" className="mt-3 inline-block text-gold-300">
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <div className="text-5xl">🔑</div>
        <h1 className="mt-2 font-display text-3xl gold-text">Game Master</h1>
        <p className="text-sm text-parchment-300">{event?.name}</p>
      </div>
      <Card>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <Label>Admin PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="text-center text-2xl tracking-[0.4em]"
              maxLength={8}
            />
          </div>
          {error && <p className="text-sm text-ember">{error}</p>}
          <Button type="submit" fullWidth disabled={busy || pin.length < 4}>
            {busy ? 'Checking…' : 'Unlock Controls'}
          </Button>
        </form>
      </Card>
      <Link to="/sheet" className="text-center text-sm text-parchment-300/70">
        ← Back to game
      </Link>
    </div>
  );
}
