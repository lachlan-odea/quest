/**
 * Admin dashboard — the Game Master's command centre. Join code, game status
 * controls, quick stats, and a seed button.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvent } from '@/hooks/useEvent';
import { useGame } from '@/context/GameContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAllQuests } from '@/hooks/useQuests';
import { useBattle } from '@/hooks/useBattle';
import {
  regenerateJoinCode,
  seedEvent,
  setEventStatus,
} from '@/services/eventService';
import { sendNotification } from '@/services/notificationService';
import type { AppNotification, EventStatus } from '@/types';
import { Badge, Button, Card, Input, Select, SectionTitle, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { event, eventId } = useEvent();
  const { players, teams } = useLeaderboard(eventId);
  const { quests } = useAllQuests(eventId);
  const { battles } = useBattle(eventId);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!event || !eventId) return null;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(event!.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; the code is shown anyway */
    }
  }

  const stats = [
    { label: 'Players', value: players.length, to: '/admin/players' },
    { label: 'Teams', value: teams.length, to: '/admin/teams' },
    { label: 'Quests', value: quests.length, to: '/admin/quests' },
    { label: 'Battles', value: battles.length, to: '/admin/battles' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Join code */}
      <Card className="text-center">
        <p className="text-sm text-parchment-300">Share this join code</p>
        <button onClick={copyCode} className="mt-1 block w-full">
          <span className="font-display text-5xl tracking-[0.3em] gold-text">
            {event.joinCode}
          </span>
        </button>
        <div className="mt-3 flex justify-center gap-2">
          <Button variant="ghost" className="text-sm" onClick={copyCode}>
            {copied ? 'Copied ✓' : '📋 Copy'}
          </Button>
          <Button
            variant="ghost"
            className="text-sm"
            onClick={async () => {
              setBusy(true);
              try {
                await regenerateJoinCode(eventId);
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          >
            🔄 New Code
          </Button>
        </div>
      </Card>

      {/* Game status */}
      <Card>
        <SectionTitle>Game Status</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {(['setup', 'active', 'finished'] as EventStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setEventStatus(eventId, s)}
              className={cn(
                'rounded-xl py-3 text-sm font-semibold capitalize transition-colors',
                event.status === s
                  ? 'bg-gold-500 text-tavern-900'
                  : 'bg-tavern-600 text-parchment-200',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      {/* Broadcast announcement */}
      <BroadcastCard eventId={eventId} />

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Card className="flex items-center justify-between">
              <div>
                <p className="font-display text-3xl text-gold-300">{s.value}</p>
                <p className="text-sm text-parchment-300">{s.label}</p>
              </div>
              <span className="text-parchment-300">›</span>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tools */}
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          fullWidth
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await seedEvent(eventId);
            } finally {
              setBusy(false);
            }
          }}
        >
          🌱 Seed Example Quests / Upgrades / Teams
        </Button>
        <Link to="/admin/quests">
          <Button fullWidth>📜 Manage & Assign Quests</Button>
        </Link>
        <Link to="/admin/settings">
          <Button variant="ghost" fullWidth>
            ⚙️ Settings & Reset
          </Button>
        </Link>
      </div>

      <Badge className="mx-auto">Status: {event.status}</Badge>
    </div>
  );
}

// ---- Broadcast announcement to everyone ------------------------------------
function BroadcastCard({ eventId }: { eventId: string }) {
  const { user } = useGame();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<AppNotification['tone']>('info');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function broadcast() {
    if (!user || !message.trim()) return;
    setBusy(true);
    try {
      await sendNotification({
        eventId,
        title,
        message,
        tone,
        createdBy: user.uid,
      });
      setTitle('');
      setMessage('');
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle>📣 Broadcast to Everyone</SectionTitle>
      <p className="-mt-2 text-sm text-parchment-300">
        Pops up centre-screen for every player in the event.
      </p>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. Round 2!)"
        maxLength={40}
      />
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What's the announcement?"
        maxLength={280}
      />
      <Select
        value={tone}
        onChange={(e) => setTone(e.target.value as AppNotification['tone'])}
      >
        <option value="info">📣 Info</option>
        <option value="warning">⚠️ Warning</option>
        <option value="celebrate">🎉 Celebrate</option>
      </Select>
      <Button fullWidth onClick={broadcast} disabled={busy || !message.trim()}>
        {sent ? 'Sent ✓' : busy ? 'Sending…' : 'Send Announcement'}
      </Button>
    </Card>
  );
}
