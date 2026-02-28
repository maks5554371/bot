import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import TeamsPage from './pages/TeamsPage';
import QuestPage from './pages/QuestPage';
import PhotosPage from './pages/PhotosPage';
import MapPage from './pages/MapPage';
import ChatPage from './pages/ChatPage';
import PlaylistPage from './pages/PlaylistPage';
import VotingPage from './pages/VotingPage';
import LeaderboardPage from './pages/LeaderboardPage';

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/quest" element={<QuestPage />} />
        <Route path="/photos" element={<PhotosPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/chat/:userId" element={<ChatPage />} />
        <Route path="/playlist" element={<PlaylistPage />} />
        <Route path="/voting" element={<VotingPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Route>
    </Routes>
  );
}
