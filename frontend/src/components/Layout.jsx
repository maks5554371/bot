import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import socket from '../services/socket';
import api from '../services/api';
import Notifications from './Notifications';

const navItems = [
  { to: '/', label: '📊 Дашборд' },
  { to: '/users', label: '👥 Участники' },
  { to: '/teams', label: '🚗 Команды' },
  { to: '/quest', label: '🗺️ Квест' },
  { to: '/messages', label: '💬 Сообщения' },
  { to: '/photos', label: '📸 Фото' },
  { to: '/map', label: '📍 Карта' },
  { to: '/playlist', label: '🎵 Плейлист' },
  { to: '/voting', label: '🗳 Голосования' },
  { to: '/leaderboard', label: '🏆 Лидерборд' },
];

export default function Layout() {
  const { admin, logout } = useAuthStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations');
      const total = res.data.reduce((sum, c) => sum + c.unread_count, 0);
      setUnreadMessages(total);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useEffect(() => {
    socket.connect();

    socket.on('new_user', (user) => {
      addNotification({
        title: 'Новый участник!',
        message: `${user.first_name || user.telegram_username || user.telegram_id} зарегистрировался`,
        type: 'info',
      });
    });

    socket.on('new_photo', (photo) => {
      addNotification({
        title: '📸 Новое фото!',
        message: `от ${photo.user_id?.first_name || 'участника'} (${photo.team_id?.name || 'без команды'})`,
        type: 'info',
      });
    });

    socket.on('location_update', (data) => {
      // Silent — just update state, no notification spam
    });

    socket.on('new_message', (data) => {
      addNotification({
        title: '💬 Новое сообщение',
        message: `от ${data.user?.first_name || 'участника'}`,
        type: 'info',
      });
      fetchUnread();
    });

    socket.on('new_song', (data) => {
      addNotification({
        title: '🎵 Новая песня',
        message: `${data.user?.first_name || 'Участник'} добавил «${data.song?.name || ''}»`,
        type: 'info',
      });
    });

    socket.on('voting_started', (voting) => {
      addNotification({
        title: '🗳 Голосование запущено',
        message: voting.title,
        type: 'info',
      });
    });

    socket.on('voting_finished', (data) => {
      addNotification({
        title: '📊 Голосование завершено',
        message: data.voting?.title || '',
        type: 'info',
      });
    });

    return () => {
      socket.off('new_user');
      socket.off('new_photo');
      socket.off('location_update');
      socket.off('new_message');
      socket.off('new_song');
      socket.off('voting_started');
      socket.off('voting_finished');
      socket.disconnect();
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">🎂 Квест</h1>
          <p className="text-xs text-gray-400 mt-1">Админ-панель</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {item.label}
              {item.to === '/messages' && unreadMessages > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadMessages}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-2">👤 {admin?.username}</p>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
          >
            Выйти →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      <Notifications />
    </div>
  );
}
