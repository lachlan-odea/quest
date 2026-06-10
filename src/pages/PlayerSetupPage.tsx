/**
 * Player setup — enter a display name and pick a fantasy class. Creates the
 * player document for this device's anonymous user.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { createPlayer } from '@/services/playerService';
import { CHARACTER_CLASSES } from '@/lib/classes';
import { Button, Card, Input, Label } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function PlayerSetupPage() {
  const { event, eventId, user } = useGame();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [className, setClassName] = useState(CHARACTER_CLASSES[0].name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !user) return;
    setBusy(true);
    setError(null);
    try {
      await createPlayer({ eventId, authUid: user.uid, name, className });
      navigate('/roll', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      <div className="mb-5 text-center">
        <h1 className="font-display text-3xl gold-text">Create Your Hero</h1>
        <p className="text-sm text-parchment-300">
          Joining <span className="text-gold-300">{event?.name}</span>
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col gap-5">
        <Card>
          <Label>Your name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What do they call you?"
            maxLength={24}
          />
        </Card>

        <div>
          <Label>Choose your class</Label>
          <div className="grid grid-cols-1 gap-2">
            {CHARACTER_CLASSES.map((c) => (
              <button
                type="button"
                key={c.name}
                onClick={() => setClassName(c.name)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                  className === c.name
                    ? 'border-gold-400 bg-gold-500/15 shadow-glow'
                    : 'border-gold-600/20 bg-tavern-700/70',
                )}
              >
                <span className="text-3xl">{c.emoji}</span>
                <span className="min-w-0">
                  <span className="block font-display text-parchment-100">
                    {c.name}
                  </span>
                  <span className="block text-xs text-parchment-300">
                    {c.tagline}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-ember">{error}</p>}
        <Button type="submit" fullWidth disabled={busy || !name.trim()}>
          {busy ? 'Summoning…' : 'Roll My Stats →'}
        </Button>
      </form>
    </div>
  );
}
