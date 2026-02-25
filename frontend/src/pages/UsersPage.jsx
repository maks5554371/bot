import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        api.get('/users'),
        api.get('/teams'),
      ]);
      setUsers(usersRes.data);
      setTeams(teamsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const assignTeam = async (userId, teamId) => {
    try {
      await api.patch(`/users/${userId}`, { team_id: teamId || null });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Участники ({users.length})</h1>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Имя</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Telegram</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Команда</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Геопозиция</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">
                  {user.first_name || '—'}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {user.telegram_username ? `@${user.telegram_username}` : user.telegram_id}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={user.team_id?._id || ''}
                    onChange={(e) => assignTeam(user._id, e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">Без команды</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.last_location?.lat ? (
                    <span className="text-green-600">
                      📍 {user.last_location.lat.toFixed(4)}, {user.last_location.lng.toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-gray-400">Нет данных</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => navigate(`/chat/${user._id}`)}
                    className="text-sm text-primary hover:text-primary-dark font-medium"
                  >
                    💬 Написать
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center py-8 text-gray-500">Пока нет зарегистрированных участников</p>
        )}
      </div>
    </div>
  );
}
