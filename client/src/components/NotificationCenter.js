import { useEffect, useState } from 'react';
import { BellIcon, CheckCircleIcon, AlertCircleIcon, XIcon } from './MarketplaceIcons';

const NotificationCenter = ({ session }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    
    // Simulate notifications - in production, fetch from API
    const mockNotifications = [
      {
        id: 1,
        type: 'order',
        title: 'Order Shipped',
        message: 'Your order #ORD-2024-001 has been shipped',
        timestamp: new Date(Date.now() - 3600000),
        read: false,
      },
      {
        id: 2,
        type: 'promotion',
        title: 'New Promotion',
        message: '20% off on electronics this week',
        timestamp: new Date(Date.now() - 7200000),
        read: false,
      },
    ];
    
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  }, [session]);

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  if (!session) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem',
          color: 'var(--ink)',
        }}
        aria-label="Notifications"
      >
        <BellIcon size={24} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: 'var(--danger)',
              color: 'white',
              borderRadius: '50%',
              width: 18,
              height: 18,
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              width: 360,
              maxWidth: '90vw',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--ink-light)',
                  }}
                >
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid var(--border)',
                      background: notification.read ? 'transparent' : '#f0f7ff',
                      display: 'flex',
                      gap: '0.75rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div style={{ flexShrink: 0 }}>
                      {notification.type === 'order' ? (
                        <CheckCircleIcon size={20} style={{ color: 'var(--success)' }} />
                      ) : (
                        <AlertCircleIcon size={20} style={{ color: 'var(--primary)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        {notification.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: 'var(--ink-light)',
                          marginBottom: '0.25rem',
                        }}
                      >
                        {notification.message}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-lighter)' }}>
                        {formatTimeAgo(notification.timestamp)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        color: 'var(--ink-light)',
                        flexShrink: 0,
                      }}
                      aria-label="Clear notification"
                    >
                      <XIcon size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default NotificationCenter;
