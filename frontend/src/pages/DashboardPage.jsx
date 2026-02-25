import { useState, useEffect } from 'react';
import api from '../services/api';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 15000); // обновлять каждые 15с
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Загрузка...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-red-500">Ошибка загрузки данных</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Дашборд</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard title="Участники" value={data.totalUsers} icon="👥" color="bg-blue-500" />
        <StatCard title="Команды" value={data.totalTeams} icon="🚗" color="bg-green-500" />
        <StatCard title="Ожидают проверки" value={data.pendingPhotos} icon="📸" color="bg-yellow-500" />
        <StatCard title="Одобрено фото" value={data.approvedPhotos} icon="✅" color="bg-emerald-500" />
        <StatCard title="Активных квестов" value={data.activeQuests} icon="🗺️" color="bg-purple-500" />
      </div>

      {/* Team progress */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Прогресс команд</h2>
        {data.teamProgress.length === 0 ? (
          <p className="text-gray-500">Команды ещё не созданы</p>
        ) : (
          <div className="space-y-4">
            {data.teamProgress.map((team) => (
              <div key={team._id} className="flex items-center gap-4">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{team.name}</span>
                    <span className="text-gray-500">
                      {team.current_clue_index}/{team.total_clues} подсказок • {team.members_count} чел.
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{
                        width: `${team.progress_percent}%`,
                        backgroundColor: team.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active locations */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Активные геопозиции ({data.activeLocations.length})
        </h2>
        {data.activeLocations.length === 0 ? (
          <p className="text-gray-500">Нет активных трансляций</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.activeLocations.map((u) => (
              <div key={u._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-xl">📍</span>
                <div>
                  <p className="font-medium text-sm">{u.first_name || u.telegram_username}</p>
                  <p className="text-xs text-gray-500">
                    {u.team_id?.name || 'Без команды'} • {u.last_location.lat.toFixed(4)}, {u.last_location.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white text-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-xs text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}
