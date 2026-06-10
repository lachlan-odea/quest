/**
 * Create event page — host a new game. The creator becomes the Game Master.
 * On success we seed default quests/upgrades/teams and drop into the admin
 * dashboard.
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { ensureAnonymousUser } from '@/services/authService';
import { createEvent, seedEvent } from '@/services/eventService';
import { Button, Card, Input, Label } from '@/components/ui';

export default function CreateEventPage() {
  const { joinEventById, enterAdminMode } = useGame();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [seed, setSeed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pin.length < 4) {
      setError('Choose an admin PIN of at least 4 digits.');
      return;
    }
    setBusy(true);
    try {
      const user = await ensureAnonymousUser();
      const event = await createEvent({
        name,
        adminPin: pin,
        adminUid: user.uid,
      });
      if (seed) await seedEvent(event.id);
      joinEventById(event.id);
      enterAdminMode();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <div className="text-5xl">👑</div>
        <h1 className="mt-2 font-display text-3xl gold-text">Host an Event</h1>
        <p className="mt-1 text-parchment-300">
          You'll be the Game Master. Players join with a code you share.
        </p>
      </div>

      <Card>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <Label>Event name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dave's Last Stand"
              maxLength={40}
            />
          </div>
          <div>
            <Label>Admin PIN</Label>
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="4+ digits"
              inputMode="numeric"
              type="password"
              maxLength={8}
            />
            <p className="mt-1 text-xs text-parchment-300/60">
              You'll use this to access Game Master controls on any device.
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm text-parchment-200">
            <input
              type="checkbox"
              checked={seed}
              onChange={(e) => setSeed(e.target.checked)}
              className="h-5 w-5 accent-gold-500"
            />
            Seed example quests, upgrades & teams (recommended)
          </label>
          {error && <p className="text-sm text-ember">{error}</p>}
          <Button type="submit" fullWidth disabled={busy || !name.trim()}>
            {busy ? 'Forging…' : 'Create Event'}
          </Button>
        </form>
      </Card>

      <Link to="/" className="text-center text-sm text-parchment-300/70">
        ← Back
      </Link>
    </div>
  );
}
