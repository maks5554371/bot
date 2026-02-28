import { useState, useEffect } from 'react';
import api from '../services/api';

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get('/users/leaderboard/top');
        setUsers(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Загрузка...</div>;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🏆 Таблица лидеров</h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase w-16">#</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Игрок</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Команда</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">❤️ Жизни</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">⭐️ Уровень</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">✨ Опыт</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">🪙 Монеты</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">🏷 Звание</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user, i) => (
              <tr
                key={user._id}
                className={`hover:bg-gray-50 ${i < 3 ? 'bg-yellow-50/50' : ''}`}
              >
                <td className="px-6 py-4 text-lg">
                  {medals[i] || <span className="text-sm text-gray-500">{i + 1}</span>}
                </td>
                <td className="px-6 py-4 font-medium text-gray-800">
                  {user.first_name || user.telegram_username || '—'}
                </td>
                <td className="px-6 py-4">
                  {user.team_id ? (
                    <span
                      className="px-2 py-1 text-xs rounded-full font-medium"
                      style={{
                        backgroundColor: user.team_id.color ? `${user.team_id.color}20` : '#f3f4f6',
                        color: user.team_id.color || '#9ca3af',
                      }}
                    >
                      {user.team_id.name}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-red-500 font-bold">
                    {'❤️'.repeat(Math.min(user.lives ?? 0, 5))}
                  </span>
                  {(user.lives ?? 0) > 5 && <span className="text-gray-400 text-xs ml-1">+{user.lives - 5}</span>}
                  <span className="text-gray-400 text-sm ml-1">({user.lives ?? 0})</span>
                </td>
                <td className="px-6 py-4 text-center font-medium">{user.level ?? 1}</td>
                <td className="px-6 py-4 text-center">{user.experience ?? 0}</td>
                <td className="px-6 py-4 text-center">{user.coins ?? 0}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.title ?? 'Новичок'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center py-8 text-gray-500">Пока нет данных</p>
        )}
      </div>
    </div>
  );
}
