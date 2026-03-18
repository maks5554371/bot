import { useState, useEffect } from 'react';
import api from '../services/api';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', color: '#3B82F6' });

  const fetchData = async () => {
    try {
      const teamsRes = await api.get('/teams');
      setTeams(teamsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/teams', newTeam);
      setNewTeam({ name: '', color: '#3B82F6' });
      setShowCreate(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTeam = async (id) => {
    if (!confirm('Удалить команду?')) return;
    try {
      await api.delete(`/teams/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const sendFirstClue = async (teamId) => {
    try {
      await api.post(`/clues/send-first/${teamId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const sendNextClue = async (teamId) => {
    try {
      await api.post(`/clues/send-next/${teamId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const sendLocationHint = async (teamId) => {
    if (!confirm('Отправить координаты текущей подсказки команде?')) return;
    try {
      await api.post(`/clues/send-location/${teamId}`);
      alert('📍 Координаты отправлены!');
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const removeMember = async (teamId, userId, name) => {
    if (!confirm(`Убрать "${name}" из команды?`)) return;
    try {
      await api.delete(`/teams/${teamId}/members/${userId}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const [drawing, setDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState(null);

  const handleDraw = async () => {
    if (!confirm('Раскидать всех зарегистрированных игроков по командам случайным образом? Текущий состав команд будет сброшен.')) return;
    setDrawing(true);
    setDrawResult(null);
    try {
      const res = await api.post('/teams/draw');
      setDrawResult(`✅ ${res.data.total_players} игрок(ов) распределены по ${res.data.teams.length} командам`);
      fetchData();
    } catch (err) {
      setDrawResult(`❌ ${err.response?.data?.error || 'Ошибка жеребьёвки'}`);
    } finally {
      setDrawing(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Команды ({teams.length})</h1>
        <div className="flex gap-3">
          <button
            onClick={handleDraw}
            disabled={drawing || teams.length === 0}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {drawing ? '⏳ Жеребьёвка...' : '🎲 Жеребьёвка'}
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Создать
          </button>
        </div>
      </div>

      {drawResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
          drawResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {drawResult}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createTeam} className="bg-white rounded-xl shadow p-6 mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              type="text"
              value={newTeam.name}
              onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              placeholder="Машина 1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Цвет</label>
            <input
              type="color"
              value={newTeam.color}
              onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
              className="w-12 h-10 rounded cursor-pointer"
            />
          </div>
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium"
          >
            Создать
          </button>
        </form>
      )}

      {/* Team cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teams.map((team) => (
          <div key={team._id} className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between" style={{ borderLeftWidth: 4, borderLeftColor: team.color }}>
              <div>
                <h3 className="font-bold text-lg text-gray-800">{team.name}</h3>
                <p className="text-sm text-gray-500">
                  {team.members.length} участник(ов) • Подсказка {team.current_clue_index + 1}
                </p>
              </div>
              <button onClick={() => deleteTeam(team._id)} className="text-red-400 hover:text-red-600 text-sm">
                🗑️
              </button>
            </div>

            {/* Quest controls */}
            <div className="px-5 py-3 bg-gray-50 flex items-center gap-3">
              <span className="text-sm text-gray-600 flex-1">Используется общий активный квест</span>
              <button
                onClick={() => sendFirstClue(team._id)}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
              >
                🚀 Старт
              </button>
              <button
                onClick={() => sendNextClue(team._id)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
              >
                ➡️ Далее
              </button>
              <button
                onClick={() => sendLocationHint(team._id)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
              >
                📍 Точка
              </button>
            </div>

            {/* Members */}
            <div className="p-5">
              {team.members.length === 0 ? (
                <p className="text-sm text-gray-400">Нет участников. Назначь через раздел «Участники».</p>
              ) : (
                <div className="space-y-2">
                  {team.members.map((m) => (
                    <div key={m._id} className="flex items-center gap-3 text-sm group">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">
                        {(m.first_name || '?')[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{m.first_name || m.telegram_username || 'Без имени'}</p>
                        {m.last_location?.lat && (
                          <p className="text-xs text-green-500">📍 Онлайн</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeMember(team._id, m._id, m.first_name || m.telegram_username || 'участника')}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity"
                        title="Убрать из команды"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Создай первую команду, нажав кнопку «+ Создать»
        </div>
      )}
    </div>
  );
}
