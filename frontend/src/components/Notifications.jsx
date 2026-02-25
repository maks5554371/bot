import { useNotificationStore } from '../store/notificationStore';

export default function Notifications() {
  const { notifications, removeNotification } = useNotificationStore();

  if (!notifications.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`p-4 rounded-lg shadow-lg text-white cursor-pointer transition-all ${
            n.type === 'error' ? 'bg-red-500' :
            n.type === 'success' ? 'bg-green-500' :
            'bg-primary'
          }`}
          onClick={() => removeNotification(n.id)}
        >
          <p className="font-medium text-sm">{n.title}</p>
          {n.message && <p className="text-xs mt-1 opacity-90">{n.message}</p>}
        </div>
      ))}
    </div>
  );
}
