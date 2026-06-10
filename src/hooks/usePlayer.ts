/** Accessor for the current user's player document. */
import { useGame } from '@/context/GameContext';
import { availableXp } from '@/services/upgradeService';

export function usePlayer() {
  const { player, playerLoading } = useGame();
  return {
    player,
    loading: playerLoading,
    hasPlayer: !!player,
    hasRolled: !!player?.hasRolled,
    availableXp: player ? availableXp(player) : 0,
  };
}
