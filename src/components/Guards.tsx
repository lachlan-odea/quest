/**
 * Route guards. Each renders its children (via <Outlet/>) only when the
 * relevant precondition is met, otherwise redirects.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Spinner } from './ui';

/** Require a joined event; otherwise go to the landing page. */
export function RequireEvent() {
  const { eventId, event, eventLoading, authLoading } = useGame();
  if (authLoading || eventLoading) return <FullScreenSpinner />;
  if (!eventId || !event) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Require a created player; otherwise send to setup. */
export function RequirePlayer() {
  const { player, playerLoading } = useGame();
  const location = useLocation();
  if (playerLoading) return <FullScreenSpinner />;
  if (!player)
    return <Navigate to="/setup" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Require admin mode; otherwise go to admin login. */
export function RequireAdmin() {
  const { isAdmin, eventLoading } = useGame();
  if (eventLoading) return <FullScreenSpinner />;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Loading the tavern…" />
    </div>
  );
}
