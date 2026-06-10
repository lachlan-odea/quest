/**
 * App layouts and route guards.
 *
 * PlayerLayout: top status bar (event, level, XP) + bottom tab navigation.
 * AdminLayout: simpler header with a back-to-game link + admin sub-nav.
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { useEvent } from '@/hooks/useEvent';
import { usePlayer } from '@/hooks/usePlayer';
import { levelProgress } from '@/lib/utils';
import { ProgressBar } from './ui';
import { GameOverlays } from './GameOverlays';
import { cn } from '@/lib/utils';

// ---- Player layout ----------------------------------------------------------
const PLAYER_TABS = [
  { to: '/sheet', label: 'Sheet', icon: '🧙' },
  { to: '/quests', label: 'Quests', icon: '📜' },
  { to: '/battle', label: 'Battle', icon: '⚔️' },
  { to: '/shop', label: 'Shop', icon: '🛒' },
  { to: '/leaderboard', label: 'Ranks', icon: '🏆' },
];

export function PlayerLayout() {
  const { event, isAdmin, leaveEvent } = useEvent();
  const { player } = usePlayer();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const prog = player && event
    ? levelProgress(player.xp, event.settings.xpPerLevel)
    : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      {/* Global popups: battle challenges + admin announcements */}
      <GameOverlays />

      {/* Top status bar */}
      <header className="sticky top-0 z-20 border-b border-gold-600/20 bg-tavern-900/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate font-display text-sm gold-text">
              {event?.name ?? 'Quest for the Buck'}
            </p>
            {player && (
              <p className="truncate text-xs text-parchment-300">
                {player.name} · Lv {prog?.level ?? player.level}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {player && (
              <div className="text-right">
                <p className="font-display text-sm text-gold-300">
                  {player.xp} XP
                </p>
              </div>
            )}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-tavern-700 text-xl"
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </div>
        {prog && (
          <div className="px-4 pb-2">
            <ProgressBar pct={prog.pct} />
          </div>
        )}

        {menuOpen && (
          <div className="absolute right-3 top-full mt-1 w-48 overflow-hidden rounded-xl border border-gold-600/30 bg-tavern-800 shadow-xl">
            <MenuLink to="/team" onClick={() => setMenuOpen(false)}>
              🛡️ My Team
            </MenuLink>
            <MenuLink to="/activity" onClick={() => setMenuOpen(false)}>
              📰 Activity Feed
            </MenuLink>
            {isAdmin ? (
              <MenuLink to="/admin" onClick={() => setMenuOpen(false)}>
                👑 Admin Dashboard
              </MenuLink>
            ) : (
              <MenuLink to="/admin/login" onClick={() => setMenuOpen(false)}>
                🔑 Admin Login
              </MenuLink>
            )}
            <button
              onClick={() => {
                setMenuOpen(false);
                leaveEvent();
                navigate('/');
              }}
              className="block w-full px-4 py-3 text-left text-sm text-ember hover:bg-white/5"
            >
              🚪 Leave Event
            </button>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom tab nav */}
      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-gold-600/20 bg-tavern-900/95 backdrop-blur">
        <div className="grid grid-cols-5">
          {PLAYER_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors',
                  isActive
                    ? 'text-gold-400'
                    : 'text-parchment-300/70 hover:text-parchment-200',
                )
              }
            >
              <span className="text-xl">{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

function MenuLink({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className="block px-4 py-3 text-sm text-parchment-100 hover:bg-white/5"
    >
      {children}
    </NavLink>
  );
}

// ---- Admin layout -----------------------------------------------------------
const ADMIN_TABS = [
  { to: '/admin', label: 'Home', end: true },
  { to: '/admin/players', label: 'Players' },
  { to: '/admin/teams', label: 'Teams' },
  { to: '/admin/quests', label: 'Quests' },
  { to: '/admin/xp', label: 'XP' },
  { to: '/admin/battles', label: 'Battles' },
  { to: '/admin/settings', label: 'Settings' },
];

export function AdminLayout() {
  const { event } = useEvent();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 border-b border-gold-600/20 bg-tavern-900/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display gold-text">👑 Game Master</p>
            <p className="text-xs text-parchment-300">{event?.name}</p>
          </div>
          <NavLink
            to="/sheet"
            className="rounded-lg bg-tavern-700 px-3 py-2 text-sm text-parchment-100"
          >
            ← Game
          </NavLink>
        </div>
        <nav className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {ADMIN_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-full px-3.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-gold-500 text-tavern-900 font-semibold'
                    : 'bg-tavern-700 text-parchment-200',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 px-4 py-4 pb-12">
        <Outlet />
      </main>
    </div>
  );
}
