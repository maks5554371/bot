import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import socket from '../services/socket';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createColorIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 24px; height: 24px; border-radius: 50%;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -16],
  });
}

const clueIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50%;
    background: #ef4444; border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  ">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -18],
});

export default function MapPage() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [quest, setQuest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [usersRes, teamsRes, questsRes] = await Promise.all([
        api.get('/users'),
        api.get('/teams'),
        api.get('/quests'),
      ]);
      setUsers(usersRes.data.filter((u) => u.last_location?.lat));
      setTeams(teamsRes.data);
      // Берём активный квест
      const activeQuest = questsRes.data.find((q) => q.status === 'active');
      setQuest(activeQuest || questsRes.data[0] || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleLocationUpdate = (data) => {
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u._id === data.user_id);
        const updated = {
          _id: data.user_id,
          telegram_id: data.telegram_id,
          first_name: data.first_name,
          team_id: data.team_id,
          last_location: data.location,
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...updated };
          return copy;
        }
        return [...prev, updated];
      });
    };

    socket.on('location_update', handleLocationUpdate);
    return () => {
      socket.off('location_update', handleLocationUpdate);
    };
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Загрузка...</div>;

  // Default center — Moscow
  const center = users.length > 0
    ? [users[0].last_location.lat, users[0].last_location.lng]
    : [55.7558, 37.6173];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Карта</h1>

      <div className="bg-white rounded-xl shadow overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
        <MapContainer center={center} zoom={13} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User markers */}
          {users.map((user) => {
            const team = teams.find(
              (t) => t._id === (typeof user.team_id === 'object' ? user.team_id?._id : user.team_id)
            );
            const color = team?.color || '#6366f1';

            return (
              <Marker
                key={user._id}
                position={[user.last_location.lat, user.last_location.lng]}
                icon={createColorIcon(color)}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{user.first_name || 'Участник'}</p>
                    <p className="text-gray-500">{team?.name || 'Без команды'}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {user.last_location.lat.toFixed(5)}, {user.last_location.lng.toFixed(5)}
                    </p>
                    {user.last_location.updated_at && (
                      <p className="text-xs text-gray-400">
                        {new Date(user.last_location.updated_at).toLocaleTimeString('ru-RU')}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Clue points */}
          {quest?.clues?.map((clue, i) => (
            clue.location?.lat && (
              <Marker
                key={`clue-${i}`}
                position={[clue.location.lat, clue.location.lng]}
                icon={clueIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">Подсказка #{i + 1}</p>
                    <p className="text-gray-600">{clue.text.substring(0, 60)}...</p>
                    <p className="text-xs text-gray-400">Радиус: {clue.radius_meters}м</p>
                  </div>
                </Popup>
              </Marker>
            )
          ))}

          {/* Geofence circles */}
          {quest?.clues?.map((clue, i) => (
            clue.location?.lat && (
              <Circle
                key={`circle-${i}`}
                center={[clue.location.lat, clue.location.lng]}
                radius={clue.radius_meters}
                pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1 }}
              />
            )
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 bg-white rounded-xl shadow p-4 flex flex-wrap gap-4">
        {teams.map((t) => (
          <div key={t._id} className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />
            <span>{t.name} ({t.members.length} чел.)</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm">
          <span>📍</span>
          <span className="text-red-500">Точки квеста</span>
        </div>
      </div>
    </div>
  );
}
