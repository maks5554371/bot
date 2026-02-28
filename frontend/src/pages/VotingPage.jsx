import { useState, useEffect } from 'react';
import api from '../services/api';

export default function VotingPage() {
  const [votings, setVotings] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedVoting, setSelectedVoting] = useState(null);
  const [results, setResults] = useState(null);

  const fetchVotings = async () => {
    try {
      const res = await api.get('/voting');
      setVotings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVotings(); }, []);

  const createVoting = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await api.post('/voting', { title: title.trim() });
      setTitle('');
      fetchVotings();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const finishVoting = async (id) => {
    try {
      const res = await api.post(`/voting/${id}/finish`);
      setResults(res.data.results);
      setSelectedVoting(id);
      fetchVotings();
    } catch (err) {
      console.error(err);
    }
  };

  const viewResults = async (id) => {
    try {
      const res = await api.get(`/voting/${id}/results`);
      setResults(res.data.results);
      setSelectedVoting(id);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteVoting = async (id) => {
    if (!confirm('Удалить голосование и все голоса?')) return;
    try {
      await api.delete(`/voting/${id}`);
      if (selectedVoting === id) {
        setSelectedVoting(null);
        setResults(null);
      }
      fetchVotings();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Загрузка...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🗳 Голосования</h1>

      {/* Create voting */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Запустить новое голосование</h2>
        <form onSubmit={createVoting} className="flex gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название голосования (напр. 'Лучший игрок дня')"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none"
          />
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium"
          >
            {creating ? '...' : '🚀 Запустить'}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          При создании нового голосования предыдущее автоматически завершается. Уведомления рассылаются всем игрокам.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Votings list */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-700">Все голосования ({votings.length})</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {votings.map((v) => (
              <div
                key={v._id}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedVoting === v._id ? 'bg-blue-50 border-l-4 border-primary' : ''
                }`}
                onClick={() => viewResults(v._id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">{v.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(v.started_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.status === 'active' ? (
                      <>
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                          Активно
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); finishVoting(v._id); }}
                          className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          Завершить
                        </button>
                      </>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                        Завершено
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteVoting(v._id); }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {votings.length === 0 && (
              <p className="text-center py-8 text-gray-400">Нет голосований</p>
            )}
          </div>
        </div>

        {/* Results panel */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-700">Результаты</h2>
          </div>
          {results ? (
            <div className="p-6 space-y-6">
              {/* Best */}
              <div>
                <h3 className="font-semibold text-green-700 mb-3">🏆 Лучший игрок</h3>
                {results.best.length > 0 ? (
                  <div className="space-y-2">
                    {results.best.map((r, i) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      return (
                        <div key={r._id} className="flex justify-between items-center px-3 py-2 bg-green-50 rounded-lg">
                          <span className="font-medium">
                            {medals[i] || `${i + 1}.`} {r.first_name || r.telegram_username}
                          </span>
                          <span className="text-sm text-gray-600 font-medium">{r.count} гол.</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Нет голосов</p>
                )}
              </div>

              {/* Worst */}
              <div>
                <h3 className="font-semibold text-red-700 mb-3">👎 Худший игрок</h3>
                {results.worst.length > 0 ? (
                  <div className="space-y-2">
                    {results.worst.map((r, i) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      return (
                        <div key={r._id} className="flex justify-between items-center px-3 py-2 bg-red-50 rounded-lg">
                          <span className="font-medium">
                            {medals[i] || `${i + 1}.`} {r.first_name || r.telegram_username}
                          </span>
                          <span className="text-sm text-gray-600 font-medium">{r.count} гол.</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Нет голосов</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center py-12 text-gray-400">Выбери голосование для просмотра результатов</p>
          )}
        </div>
      </div>
    </div>
  );
}
