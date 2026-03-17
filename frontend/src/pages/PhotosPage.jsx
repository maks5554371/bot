import { useState, useEffect } from 'react';
import api from '../services/api';

export default function PhotosPage() {
  const [photos, setPhotos] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [teamFilter, setTeamFilter] = useState('');

  const fetchPhotos = async () => {
    try {
      const params = {};
      if (filter) params.status = filter;
      if (teamFilter) params.team_id = teamFilter;
      const res = await api.get('/photos', { params });
      setPhotos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [photosRes, teamsRes] = await Promise.all([
          api.get('/photos', { params: { status: filter } }),
          api.get('/teams'),
        ]);
        setPhotos(photosRes.data);
        setTeams(teamsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchPhotos();
    }
  }, [filter, teamFilter]);

  const reviewPhoto = async (id, status, comment = '') => {
    try {
      await api.patch(`/photos/${id}`, { status, admin_comment: comment });
      fetchPhotos();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Фото-отчёты</h1>
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected', ''].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 shadow'
              }`}
            >
              {f === 'pending' ? '⏳ Ожидают' :
               f === 'approved' ? '✅ Одобрены' :
               f === 'rejected' ? '❌ Отклонены' :
               '📋 Все'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 bg-white rounded-xl shadow p-4">
        <label className="text-sm text-gray-600 mr-2">Фильтр по команде:</label>
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="">Все команды</option>
          {teams.map((team) => (
            <option key={team._id} value={team._id}>{team.name}</option>
          ))}
        </select>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Нет фото-отчётов</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <div key={photo._id} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={`/api/photos/${photo._id}/image`}
                  alt="Фото-отчёт"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                  photo.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  photo.status === 'approved' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {photo.status === 'pending' ? '⏳ Ожидает' :
                   photo.status === 'approved' ? '✅ Одобрено' :
                   '❌ Отклонено'}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {photo.team_id && (
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: photo.team_id.color }}
                    />
                  )}
                  <span className="text-sm font-medium">
                    {photo.team_id?.name || 'Без команды'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  👤 {photo.user_id?.first_name || photo.user_id?.telegram_username || 'Аноним'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Подсказка #{photo.clue_index + 1} • {new Date(photo.submitted_at).toLocaleString('ru-RU')}
                </p>

                {photo.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => reviewPhoto(photo._id, 'approved')}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium"
                    >
                      ✅ Одобрить
                    </button>
                    <button
                      onClick={() => reviewPhoto(photo._id, 'rejected')}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium"
                    >
                      ❌ Отклонить
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
