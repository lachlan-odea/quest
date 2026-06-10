/**
 * GameContext — the single source of truth for the current session:
 *   - the anonymous auth user
 *   - the joined event (real-time)
 *   - this user's player document (real-time)
 *   - whether the user is acting as admin
 *
 * The joined event id and admin flag are persisted to localStorage so a phone
 * can refresh / reopen the app mid-night without losing its place.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import type { GameEvent, Player } from '@/types';
import { ensureAnonymousUser, subscribeAuth } from '@/services/authService';
import { subscribeEvent, isAdmin as isAdminFn } from '@/services/eventService';
import { subscribePlayerForAuth } from '@/services/playerService';

const LS_EVENT = 'qftg.eventId';
const LS_ADMIN = 'qftg.adminEventId';

interface GameContextValue {
  user: User | null;
  authLoading: boolean;

  eventId: string | null;
  event: GameEvent | null;
  eventLoading: boolean;

  player: Player | null;
  playerLoading: boolean;

  /** True when this user is an event admin AND has opted into admin mode. */
  isAdmin: boolean;

  joinEventById: (eventId: string) => void;
  leaveEvent: () => void;
  enterAdminMode: () => void;
  exitAdminMode: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [eventId, setEventId] = useState<string | null>(
    () => localStorage.getItem(LS_EVENT),
  );
  const [event, setEvent] = useState<GameEvent | null>(null);
  const [eventLoading, setEventLoading] = useState<boolean>(!!eventId);

  const [player, setPlayer] = useState<Player | null>(null);
  const [playerLoading, setPlayerLoading] = useState<boolean>(!!eventId);

  const [adminOptIn, setAdminOptIn] = useState<boolean>(
    () => localStorage.getItem(LS_ADMIN) === localStorage.getItem(LS_EVENT),
  );

  // 1) Ensure an anonymous user exists, then track auth state.
  useEffect(() => {
    ensureAnonymousUser().catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[auth] anonymous sign-in failed', e);
    });
    return subscribeAuth((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  // 2) Subscribe to the joined event.
  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      setEventLoading(false);
      return;
    }
    setEventLoading(true);
    return subscribeEvent(eventId, (e) => {
      setEvent(e);
      setEventLoading(false);
    });
  }, [eventId]);

  // 3) Subscribe to this user's player doc in the event.
  useEffect(() => {
    if (!eventId || !user) {
      setPlayer(null);
      setPlayerLoading(false);
      return;
    }
    setPlayerLoading(true);
    return subscribePlayerForAuth(eventId, user.uid, (p) => {
      setPlayer(p);
      setPlayerLoading(false);
    });
  }, [eventId, user]);

  const joinEventById = useCallback((id: string) => {
    localStorage.setItem(LS_EVENT, id);
    setEventId(id);
  }, []);

  const leaveEvent = useCallback(() => {
    localStorage.removeItem(LS_EVENT);
    localStorage.removeItem(LS_ADMIN);
    setEventId(null);
    setAdminOptIn(false);
  }, []);

  const enterAdminMode = useCallback(() => {
    if (eventId) localStorage.setItem(LS_ADMIN, eventId);
    setAdminOptIn(true);
  }, [eventId]);

  const exitAdminMode = useCallback(() => {
    localStorage.removeItem(LS_ADMIN);
    setAdminOptIn(false);
  }, []);

  const isAdmin = useMemo(
    () => adminOptIn && isAdminFn(event, user?.uid ?? null),
    [adminOptIn, event, user],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      user,
      authLoading,
      eventId,
      event,
      eventLoading,
      player,
      playerLoading,
      isAdmin,
      joinEventById,
      leaveEvent,
      enterAdminMode,
      exitAdminMode,
    }),
    [
      user,
      authLoading,
      eventId,
      event,
      eventLoading,
      player,
      playerLoading,
      isAdmin,
      joinEventById,
      leaveEvent,
      enterAdminMode,
      exitAdminMode,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
