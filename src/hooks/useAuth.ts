/** Thin accessor for the current anonymous auth user. */
import { useGame } from '@/context/GameContext';

export function useAuth() {
  const { user, authLoading } = useGame();
  return { user, uid: user?.uid ?? null, loading: authLoading };
}
