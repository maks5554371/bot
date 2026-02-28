import { useState, useEffect } from 'react';
import api from '../services/api';
import socket from '../services/socket';

export default function PlaylistPage() {
  const [songs, setSongs] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('all'); // 'all' | 'byUser'

  const fetchSongs = async () => {
    try {
      const res = await api.get('/songs');
      setSongs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/songs/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchSongs(), fetchStats()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();

    socket.on('new_song', () => {
      fetchAll();
    });

    return () => {
      socket.off('new_song');
    };
  }, []);

  const deleteSong = async (id) => {
    if (!confirm('Удалить песню из плейлиста?')) return;
    try {
      await api.delete(`/songs/${id}`);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🎵 Плейлист</h1>
          <p className="text-sm text-gray-500 mt-1">
            Всего песен: {songs.length} · Участников: {stats.length}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'all'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 shadow'
            }`}
          >
            📋 Все песни
          </button>
          <button
            onClick={() => setView('byUser')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'byUser'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 shadow'
            }`}
          >
            👥 По участникам
          </button>
        </div>
      </div>

      {view === 'all' ? (
        <AllSongsView songs={songs} onDelete={deleteSong} />
      ) : (
        <ByUserView stats={stats} />
      )}
    </div>
  );
}

function AllSongsView({ songs, onDelete }) {
  if (songs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Ещё никто не добавил песен
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Песня</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Исполнитель</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Участник</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Spotify</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Статус</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {songs.map((song, i) => (
            <tr key={song._id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-400">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {song.cover_url && (
                    <img
                      src={song.cover_url}
                      alt=""
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <span className="font-medium text-gray-800">{song.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600">{song.artist}</td>
              <td className="px-4 py-3 text-gray-600">
                {song.user_id?.first_name || song.user_id?.telegram_username || '—'}
              </td>
              <td className="px-4 py-3">
                {song.external_url && (
                  <a
                    href={song.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Открыть ↗
                  </a>
                )}
              </td>
              <td className="px-4 py-3">
                {song.added_to_playlist ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    ✅ В плейлисте
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    ⚠️ Не добавлена
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onDelete(song._id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  title="Удалить"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ByUserView({ stats }) {
  if (stats.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Ещё никто не добавил песен
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stats.map((item, idx) => (
        <div key={idx} className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-semibold text-gray-800">
                {item.user?.first_name || item.user?.telegram_username || 'Неизвестный'}
              </h3>
              {item.user?.telegram_username && (
                <span className="text-xs text-gray-400">@{item.user.telegram_username}</span>
              )}
            </div>
            <span className="text-sm font-medium text-gray-500">
              {item.count}/10 песен
            </span>
          </div>
          <div className="space-y-2">
            {item.songs.map((song, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {song.cover_url && (
                  <img src={song.cover_url} alt="" className="w-8 h-8 rounded" />
                )}
                <div className="flex-1">
                  <span className="font-medium text-gray-700">{song.name}</span>
                  <span className="text-gray-400"> — {song.artist}</span>
                </div>
                {song.external_url && (
                  <a
                    href={song.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 text-xs"
                  >
                    Spotify ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
