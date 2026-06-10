/**
 * App + routing.
 *
 * Route groups:
 *   Public        — landing, join, create, admin login
 *   Player (game) — needs a joined event + a created+rolled player; uses the
 *                   PlayerLayout (status bar + bottom tabs)
 *   Admin         — needs admin mode; uses the AdminLayout
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GameProvider } from '@/context/GameContext';
import { PlayerLayout, AdminLayout } from '@/components/Layout';
import { RequireAdmin, RequireEvent, RequirePlayer } from '@/components/Guards';

import LandingPage from '@/pages/LandingPage';
import JoinPage from '@/pages/JoinPage';
import CreateEventPage from '@/pages/CreateEventPage';
import PlayerSetupPage from '@/pages/PlayerSetupPage';
import DiceRollPage from '@/pages/DiceRollPage';
import CharacterSheetPage from '@/pages/CharacterSheetPage';
import QuestsPage from '@/pages/QuestsPage';
import TeamPage from '@/pages/TeamPage';
import BattlePage from '@/pages/BattlePage';
import BattleResultPage from '@/pages/BattleResultPage';
import ShopPage from '@/pages/ShopPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import ActivityFeedPage from '@/pages/ActivityFeedPage';

import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminPlayers from '@/pages/admin/AdminPlayers';
import AdminTeams from '@/pages/admin/AdminTeams';
import AdminQuests from '@/pages/admin/AdminQuests';
import AdminXP from '@/pages/admin/AdminXP';
import AdminBattles from '@/pages/admin/AdminBattles';
import AdminSettings from '@/pages/admin/AdminSettings';

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/create" element={<CreateEventPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Needs a joined event */}
          <Route element={<RequireEvent />}>
            {/* Setup / roll can run before the player is fully created */}
            <Route path="/setup" element={<PlayerSetupPage />} />

            {/* Player game (needs a created player) */}
            <Route element={<RequirePlayer />}>
              <Route path="/roll" element={<DiceRollPage />} />
              <Route element={<PlayerLayout />}>
                <Route path="/sheet" element={<CharacterSheetPage />} />
                <Route path="/quests" element={<QuestsPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/battle" element={<BattlePage />} />
                <Route path="/battle/:id" element={<BattleResultPage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/activity" element={<ActivityFeedPage />} />
              </Route>
            </Route>

            {/* Admin (needs admin mode) */}
            <Route element={<RequireAdmin />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/players" element={<AdminPlayers />} />
                <Route path="/admin/teams" element={<AdminTeams />} />
                <Route path="/admin/quests" element={<AdminQuests />} />
                <Route path="/admin/xp" element={<AdminXP />} />
                <Route path="/admin/battles" element={<AdminBattles />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}
