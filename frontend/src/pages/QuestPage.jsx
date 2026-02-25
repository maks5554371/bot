import { useState, useEffect } from 'react';
import api from '../services/api';

export default function QuestPage() {
  const [quests, setQuests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [clueForm, setClueForm] = useState({ text: '', lat: '', lng: '', radius_meters: 100, photo_required: true });

  const fetchQuests = async () => {
    try {
      const res = await api.get('/quests');
      setQuests(res.data);
      if (res.data.length && !selected) setSelected(res.data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuests(); }, []);

  const createQuest = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/quests', form);
      setForm({ title: '', description: '' });
      setShowCreate(false);
      await fetchQuests();
      setSelected(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addClue = async (e) => {
    e.preventDefault();
    if (!selected) return;
    const newClue = {
      order: (selected.clues?.length || 0) + 1,
      text: clueForm.text,
      location: {
        lat: clueForm.lat ? parseFloat(clueForm.lat) : null,
        lng: clueForm.lng ? parseFloat(clueForm.lng) : null,
      },
      radius_meters: parseInt(clueForm.radius_meters) || 100,
      photo_required: clueForm.photo_required,
    };

    try {
      const clues = [...(selected.clues || []), newClue];
      const res = await api.patch(`/quests/${selected._id}`, { clues });
      setSelected(res.data);
      setClueForm({ text: '', lat: '', lng: '', radius_meters: 100, photo_required: true });
      fetchQuests();
    } catch (err) {
      console.error(err);
    }
  };

  const removeClue = async (index) => {
    if (!selected) return;
    const clues = selected.clues.filter((_, i) => i !== index);
    // Re-order
    clues.forEach((c, i) => { c.order = i + 1; });
    try {
      const res = await api.patch(`/quests/${selected._id}`, { clues });
      setSelected(res.data);
      fetchQuests();
    } catch (err) {
      console.error(err);
    }
  };

  const activateQuest = async () => {
    if (!selected) return;
    try {
      const res = await api.patch(`/quests/${selected._id}`, { status: 'active' });
      setSelected(res.data);
      fetchQuests();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Квест</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Новый квест
        </button>
      </div>

      {/* Create quest form */}
      {showCreate && (
        <form onSubmit={createQuest} className="bg-white rounded-xl shadow p-6 mb-6 space-y-3">
          <input
            type="text"
            placeholder="Название квеста"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            required
          />
          <textarea
            placeholder="Описание (необязательно)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            rows={2}
          />
          <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium">
            Создать
          </button>
        </form>
      )}

      <div className="flex gap-6">
        {/* Quest list */}
        <div className="w-64 space-y-2">
          {quests.map((q) => (
            <button
              key={q._id}
              onClick={() => setSelected(q)}
              className={`w-full text-left p-4 rounded-xl transition-all ${
                selected?._id === q._id ? 'bg-primary text-white shadow-lg' : 'bg-white hover:bg-gray-50 shadow'
              }`}
            >
              <p className="font-medium text-sm">{q.title}</p>
              <p className={`text-xs mt-1 ${selected?._id === q._id ? 'text-indigo-200' : 'text-gray-500'}`}>
                {q.clues?.length || 0} подсказок • {q.status}
              </p>
            </button>
          ))}
          {quests.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Нет квестов</p>
          )}
        </div>

        {/* Quest detail */}
        {selected && (
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selected.title}</h2>
                  {selected.description && <p className="text-gray-500 mt-1">{selected.description}</p>}
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selected.status === 'active' ? 'bg-green-100 text-green-700' :
                    selected.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selected.status}
                  </span>
                  {selected.status === 'draft' && (
                    <button
                      onClick={activateQuest}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium"
                    >
                      Активировать
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Clues list */}
            <div className="space-y-3 mb-6">
              {(selected.clues || []).map((clue, i) => (
                <div key={i} className="bg-white rounded-xl shadow p-4 flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800">{clue.text}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      {clue.location?.lat && (
                        <span>📍 {clue.location.lat.toFixed(4)}, {clue.location.lng.toFixed(4)}</span>
                      )}
                      <span>📏 Радиус: {clue.radius_meters}м</span>
                      {clue.photo_required && <span>📸 Фото обязательно</span>}
                    </div>
                  </div>
                  <button onClick={() => removeClue(i)} className="text-red-400 hover:text-red-600">
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add clue form */}
            <form onSubmit={addClue} className="bg-white rounded-xl shadow p-6 space-y-3">
              <h3 className="font-semibold text-gray-800">Добавить подсказку</h3>
              <textarea
                placeholder="Текст подсказки *"
                value={clueForm.text}
                onChange={(e) => setClueForm({ ...clueForm, text: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                rows={3}
                required
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  step="any"
                  placeholder="Широта (lat)"
                  value={clueForm.lat}
                  onChange={(e) => setClueForm({ ...clueForm, lat: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Долгота (lng)"
                  value={clueForm.lng}
                  onChange={(e) => setClueForm({ ...clueForm, lng: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
                <input
                  type="number"
                  placeholder="Радиус (м)"
                  value={clueForm.radius_meters}
                  onChange={(e) => setClueForm({ ...clueForm, radius_meters: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="photo_req"
                  checked={clueForm.photo_required}
                  onChange={(e) => setClueForm({ ...clueForm, photo_required: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="photo_req" className="text-sm text-gray-700">Фото обязательно</label>
              </div>
              <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg text-sm font-medium">
                Добавить подсказку
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
