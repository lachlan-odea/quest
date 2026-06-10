/** Accessor for the currently joined event and admin status. */
import { useGame } from '@/context/GameContext';

export function useEvent() {
  const {
    event,
    eventId,
    eventLoading,
    isAdmin,
    joinEventById,
    leaveEvent,
    enterAdminMode,
    exitAdminMode,
  } = useGame();
  return {
    event,
    eventId,
    loading: eventLoading,
    settings: event?.settings ?? null,
    isAdmin,
    joinEventById,
    leaveEvent,
    enterAdminMode,
    exitAdminMode,
  };
}
