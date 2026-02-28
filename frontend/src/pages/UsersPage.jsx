import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [view, setView] = useState('table'); // 'table' | 'cards'
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

  const openEditProfile = (user) => {
    setEditingUser(user._id);
    setEditForm({
      lives: user.lives ?? 3,
      experience: user.experience ?? 0,
      level: user.level ?? 1,
      title: user.title ?? 'Новичок',
      coins: user.coins ?? 0,
    });
  };

  const saveProfile = async (userId) => {
    try {
      await api.patch(`/users/${userId}`, editForm);
      setEditingUser(null);
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
        <div className="flex gap-2">
          <button
            onClick={() => setView('table')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              view === 'table' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            📋 Таблица
          </button>
          <button
            onClick={() => setView('cards')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              view === 'cards' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            🃏 Карточки
          </button>
        </div>
      </div>

      {view === 'table' ? (
        /* Table view */
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Имя</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Telegram</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Команда</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">❤️ Жизни</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ур.</th>
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
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-red-500 font-bold">{'❤️'.repeat(Math.min(user.lives ?? 3, 5))}</span>
                    <span className="text-gray-400 ml-1 text-sm">({user.lives ?? 3})</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.level ?? 1}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => openEditProfile(user)}
                      className="text-sm text-primary hover:text-primary-dark font-medium"
                    >
                      ✏️ Профиль
                    </button>
                    <button
                      onClick={() => navigate(`/chat/${user._id}`)}
                      className="text-sm text-primary hover:text-primary-dark font-medium"
                    >
                      💬
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
      ) : (
        /* Cards view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div key={user._id} className="bg-white rounded-xl shadow p-5 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{user.first_name || '—'}</h3>
                  <p className="text-sm text-gray-400">
                    {user.telegram_username ? `@${user.telegram_username}` : `ID: ${user.telegram_id}`}
                  </p>
                </div>
                <span
                  className="px-2 py-1 text-xs rounded-full font-medium"
                  style={{
                    backgroundColor: user.team_id?.color ? `${user.team_id.color}20` : '#f3f4f6',
                    color: user.team_id?.color || '#9ca3af',
                  }}
                >
                  {user.team_id?.name || 'Без команды'}
                </span>
              </div>

              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">❤️ Жизни</span>
                  <span className="font-medium">{'❤️'.repeat(Math.min(user.lives ?? 3, 5))} ({user.lives ?? 3})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">⭐️ Уровень</span>
                  <span className="font-medium">{user.level ?? 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">✨ Опыт</span>
                  <span className="font-medium">{user.experience ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">🪙 Монеты</span>
                  <span className="font-medium">{user.coins ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">🏷 Звание</span>
                  <span className="font-medium">{user.title ?? 'Новичок'}</span>
                </div>
              </div>

              {/* Stats */}
              {user.stats && (
                <div className="border-t mt-3 pt-3 text-xs text-gray-400 grid grid-cols-2 gap-1">
                  <span>📸 {user.stats.photos_sent ?? 0} фото</span>
                  <span>💬 {user.stats.messages_sent ?? 0} сообщ.</span>
                  <span>🎵 {user.stats.songs_added ?? 0} песен</span>
                  <span>🗳 {user.stats.votes_cast ?? 0} голосов</span>
                </div>
              )}

              {/* Inventory */}
              {user.inventory && user.inventory.length > 0 && (
                <div className="border-t mt-3 pt-3">
                  <p className="text-xs text-gray-400 mb-1">🎒 Инвентарь:</p>
                  <div className="flex flex-wrap gap-1">
                    {user.inventory.map((item, i) => (
                      <span key={i} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                        {item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => openEditProfile(user)}
                  className="flex-1 text-sm py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
                >
                  ✏️ Редактировать
                </button>
                <button
                  onClick={() => navigate(`/chat/${user._id}`)}
                  className="px-4 text-sm py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  💬
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit profile modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">✏️ Редактирование профиля</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">❤️ Жизни</label>
                <input
                  type="number"
                  value={editForm.lives}
                  onChange={(e) => setEditForm({ ...editForm, lives: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">✨ Опыт</label>
                <input
                  type="number"
                  value={editForm.experience}
                  onChange={(e) => setEditForm({ ...editForm, experience: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">⭐️ Уровень</label>
                <input
                  type="number"
                  value={editForm.level}
                  onChange={(e) => setEditForm({ ...editForm, level: parseInt(e.target.value) || 1 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">🏷 Звание</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">🪙 Монеты</label>
                <input
                  type="number"
                  value={editForm.coins}
                  onChange={(e) => setEditForm({ ...editForm, coins: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => saveProfile(editingUser)}
                className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
              >
                💾 Сохранить
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
