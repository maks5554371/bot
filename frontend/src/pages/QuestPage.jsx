import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationPicker({ value, onChange }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  if (!value?.lat || !value?.lng) return null;
  return <Marker position={[value.lat, value.lng]} />;
}

export default function QuestPage() {
  const [quests, setQuests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [locationMode, setLocationMode] = useState('map');
  const [form, setForm] = useState({ title: '', description: '' });
  const [clueForm, setClueForm] = useState({
    text: '',
    task_text: '',
    answers: '',
    lat: '',
    lng: '',
    address_text: '',
    radius_meters: 100,
    photo_required: true,
    mediaFile: null,
    mediaPreview: '',
  });

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

  useEffect(() => {
    fetchQuests();
  }, []);

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

  const uploadMedia = async () => {
    if (!clueForm.mediaFile) return null;

    const data = new FormData();
    data.append('media', clueForm.mediaFile);

    const res = await api.post('/quests/media', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return res.data.media;
  };

  const resetClueForm = () => {
    setClueForm({
      text: '',
      task_text: '',
      answers: '',
      lat: '',
      lng: '',
      address_text: '',
      radius_meters: 100,
      photo_required: true,
      mediaFile: null,
      mediaPreview: '',
    });
  };

  const addClue = async (e) => {
    e.preventDefault();
    if (!selected) return;

    try {
      const uploadedMedia = await uploadMedia();
      const answersArray = clueForm.answers
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const newClue = {
        order: (selected.clues?.length || 0) + 1,
        text: clueForm.text,
        task_text: clueForm.task_text || '',
        answers: answersArray,
        location: {
          lat: clueForm.lat ? parseFloat(clueForm.lat) : null,
          lng: clueForm.lng ? parseFloat(clueForm.lng) : null,
          address_text: clueForm.address_text || '',
        },
        radius_meters: parseInt(clueForm.radius_meters, 10) || 100,
        photo_required: clueForm.photo_required,
      };

      if (uploadedMedia) {
        newClue.media = uploadedMedia;
        newClue.media_url = uploadedMedia.url;
      }

      const clues = [...(selected.clues || []), newClue];
      const res = await api.patch(`/quests/${selected._id}`, { clues });
      setSelected(res.data);
      resetClueForm();
      await fetchQuests();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка при добавлении подсказки');
      console.error(err);
    }
  };

  const removeClue = async (index) => {
    if (!selected) return;
    const clues = selected.clues.filter((_, i) => i !== index);
    clues.forEach((c, i) => {
      c.order = i + 1;
    });

    try {
      const res = await api.patch(`/quests/${selected._id}`, { clues });
      setSelected(res.data);
      await fetchQuests();
    } catch (err) {
      console.error(err);
    }
  };

  const activateQuest = async () => {
    if (!selected) return;
    try {
      const res = await api.patch(`/quests/${selected._id}`, { status: 'active' });
      setSelected(res.data);
      await fetchQuests();
    } catch (err) {
      console.error(err);
    }
  };

  const setMapPoint = (point) => {
    setClueForm((prev) => ({
      ...prev,
      lat: String(point.lat),
      lng: String(point.lng),
    }));
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
                {q.clues?.length || 0} станций • {q.status}
              </p>
            </button>
          ))}
          {quests.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Нет квестов</p>}
        </div>

        {selected && (
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selected.title}</h2>
                  {selected.description && <p className="text-gray-500 mt-1">{selected.description}</p>}
                </div>
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selected.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : selected.status === 'completed'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
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

            <div className="space-y-3 mb-6">
              {(selected.clues || []).map((clue, i) => (
                <div key={i} className="bg-white rounded-xl shadow p-4 flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="mb-2">
                      <span className="text-xs font-medium text-primary uppercase">Подсказка</span>
                      <p className="text-gray-800">{clue.text}</p>
                    </div>
                    {clue.task_text && (
                      <div className="mb-2 bg-amber-50 rounded-lg p-2">
                        <span className="text-xs font-medium text-amber-600 uppercase">Задание</span>
                        <p className="text-gray-700 text-sm">{clue.task_text}</p>
                      </div>
                    )}
                    {clue.answers && clue.answers.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        <span className="text-xs text-gray-500">Ответы:</span>
                        {clue.answers.map((a, j) => (
                          <span key={j} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                    {(clue.media?.url || clue.media_url) && (
                      <div className="mb-2">
                        {clue.media?.type === 'video' ? (
                          <video controls className="max-h-48 rounded-lg border" src={clue.media.url || clue.media_url} />
                        ) : (
                          <img className="max-h-48 rounded-lg border" src={clue.media?.url || clue.media_url} alt="media" />
                        )}
                      </div>
                    )}
                    <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                      {clue.location?.lat && <span>📍 {clue.location.lat.toFixed(4)}, {clue.location.lng.toFixed(4)}</span>}
                      {clue.location?.address_text && <span>🏠 {clue.location.address_text}</span>}
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

            <form onSubmit={addClue} className="bg-white rounded-xl shadow p-6 space-y-4">
              <h3 className="font-semibold text-gray-800">Добавить станцию</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🔍 Подсказка *</label>
                <textarea
                  placeholder="Загадка или описание, которое поможет найти место"
                  value={clueForm.text}
                  onChange={(e) => setClueForm({ ...clueForm, text: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📋 Задание</label>
                <textarea
                  placeholder="Что нужно сделать на этой станции (найди и сфотографируйся...)"
                  value={clueForm.task_text}
                  onChange={(e) => setClueForm({ ...clueForm, task_text: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">✅ Правильные ответы</label>
                <input
                  type="text"
                  placeholder="Через запятую: красная площадь, red square"
                  value={clueForm.answers}
                  onChange={(e) => setClueForm({ ...clueForm, answers: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Если участник пришлёт правильный ответ — автоматически получит адрес следующей станции</p>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Медиа (фото или видео)</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setClueForm({
                      ...clueForm,
                      mediaFile: file,
                      mediaPreview: file ? URL.createObjectURL(file) : '',
                    });
                  }}
                  className="block w-full text-sm text-gray-600"
                />
                {clueForm.mediaPreview && (
                  <div className="mt-2">
                    {clueForm.mediaFile?.type?.startsWith('video/') ? (
                      <video controls src={clueForm.mediaPreview} className="max-h-48 rounded-lg border" />
                    ) : (
                      <img src={clueForm.mediaPreview} alt="preview" className="max-h-48 rounded-lg border" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocationMode('map')}
                  className={`px-3 py-1.5 rounded-lg text-sm ${locationMode === 'map' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  На карте
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode('address')}
                  className={`px-3 py-1.5 rounded-lg text-sm ${locationMode === 'address' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  По адресу
                </button>
              </div>

              {locationMode === 'map' ? (
                <div>
                  <div className="h-64 rounded-xl overflow-hidden border border-gray-200">
                    <MapContainer center={[55.7558, 37.6173]} zoom={11} className="h-full w-full">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationPicker
                        value={{
                          lat: clueForm.lat ? Number(clueForm.lat) : null,
                          lng: clueForm.lng ? Number(clueForm.lng) : null,
                        }}
                        onChange={setMapPoint}
                      />
                    </MapContainer>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Кликни по карте, чтобы выбрать точку.</p>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Введите адрес (например, Тверская 1, Москва)"
                  value={clueForm.address_text}
                  onChange={(e) => setClueForm({ ...clueForm, address_text: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              )}

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
                Добавить станцию
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
