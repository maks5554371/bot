import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    const handleNew = () => fetchConversations();
    socket.on('new_message', handleNew);
    socket.on('message_sent', handleNew);
    return () => {
      socket.off('new_message', handleNew);
      socket.off('message_sent', handleNew);
    };
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const openChat = async (conv) => {
    if (conv.unread_count > 0) {
      try {
        await api.post(`/messages/read/${conv._id}`);
      } catch (e) {
        // ignore
      }
    }
    navigate(`/chat/${conv._id}`);
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Загрузка...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Сообщения
          {totalUnread > 0 && (
            <span className="ml-3 text-sm bg-red-500 text-white px-2.5 py-1 rounded-full font-medium">
              {totalUnread} новых
            </span>
          )}
        </h1>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          Пока нет сообщений от участников
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow divide-y">
          {conversations.map((conv) => (
            <div
              key={conv._id}
              onClick={() => openChat(conv)}
              className={`flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                conv.unread_count > 0 ? 'bg-blue-50/50' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {(conv.user.first_name || '?')[0]}
                </div>
                {conv.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {conv.unread_count}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className={`font-medium truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                    {conv.user.first_name || conv.user.telegram_username || conv.user.telegram_id}
                  </p>
                  <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                    {formatTime(conv.last_message.sent_at)}
                  </span>
                </div>
                <p className={`text-sm truncate mt-0.5 ${conv.unread_count > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                  {conv.last_message.from_admin ? '← Вы: ' : ''}
                  {conv.last_message.text}
                </p>
              </div>

              {/* Arrow */}
              <span className="text-gray-300 text-lg">›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const dayMs = 86400000;

  if (diff < dayMs && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 2 * dayMs) {
    return 'Вчера';
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
