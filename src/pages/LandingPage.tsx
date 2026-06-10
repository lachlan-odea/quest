/**
 * Landing page — the entry point. Join an existing event by code, or host a
 * new one. If the user is already in an event, bounce them to their sheet.
 */
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Button, Card } from '@/components/ui';

export default function LandingPage() {
  const { eventId, event } = useGame();
  const navigate = useNavigate();

  // Already in an event? Go straight to the game.
  useEffect(() => {
    if (eventId && event) navigate('/sheet', { replace: true });
  }, [eventId, event, navigate]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <img
          src="/logo-512.png"
          alt="Quest for the Buck"
          className="mx-auto w-64 max-w-[80%] drop-shadow-[0_0_25px_rgba(212,165,49,0.25)]"
        />
        <p className="mt-3 text-parchment-300">
          A legendary night of stats, secret quests and glorious battles.
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <Button fullWidth onClick={() => navigate('/join')}>
          🎟️ Join an Event
        </Button>
        <Link to="/create">
          <Button variant="secondary" fullWidth>
            👑 Host a New Event
          </Button>
        </Link>
      </Card>

      <p className="text-center text-xs text-parchment-300/60">
        No app install needed. Add to your home screen for the full experience.
      </p>
    </div>
  );
}
