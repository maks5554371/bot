import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';

export default function ChatPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchData = async () => {
    try {
      const [userRes, msgRes] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get('/messages', { params: { user_id: userId } }),
      ]);
      setUser(userRes.data);
      setMessages(msgRes.data.reverse()); // oldest first
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleNewMessage = (data) => {
      if (data.target_user_id === userId || data.user?._id === userId) {
        fetchData();
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleNewMessage);
    };
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post('/messages', { user_id: userId, text: text.trim() });
      setText('');
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Загрузка...</div>;
  if (!user) return <div className="text-center py-12 text-red-500">Участник не найден</div>;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          ← Назад
        </button>
        <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
          {(user.first_name || '?')[0]}
        </div>
        <div>
          <p className="font-bold">{user.first_name || 'Без имени'}</p>
          <p className="text-sm text-gray-500">
            {user.telegram_username ? `@${user.telegram_username}` : `ID: ${user.telegram_id}`}
            {user.team_id?.name && ` • ${user.team_id.name}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto bg-white rounded-xl shadow p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 py-8">Нет сообщений</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${msg.from_admin ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-md px-4 py-2 rounded-2xl ${
                msg.from_admin
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <p className={`text-xs mt-1 ${msg.from_admin ? 'text-indigo-200' : 'text-gray-400'}`}>
                {new Date(msg.sent_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                {msg.from_admin && (msg.delivered ? ' ✓' : ' ✗')}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="mt-4 flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написать сообщение..."
          className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none shadow"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {sending ? '...' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}
