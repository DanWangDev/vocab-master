import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, X, CheckCheck, UserPlus, UserCheck, UserX, Award, Clock, Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import type { Notification } from '../../services/ApiService';

interface NotificationDropdownProps {
  onClose: () => void;
}

function useFormatTimeAgo() {
  const { t } = useTranslation('notifications');
  return (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return t('justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('daysAgo', { count: days });
    return date.toLocaleDateString();
  };
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'link_request':
      return <UserPlus size={18} className="text-primary-500" />;
    case 'link_accepted':
      return <UserCheck size={18} className="text-study" />;
    case 'link_rejected':
      return <UserX size={18} className="text-red-500" />;
    case 'achievement':
      return <Award size={18} className="text-yellow-500" />;
    case 'reminder':
      return <Clock size={18} className="text-primary-400" />;
    default:
      return null;
  }
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  loading?: boolean;
}

function NotificationItem({ notification, onMarkRead, onAccept, onReject, loading }: NotificationItemProps) {
  const { t } = useTranslation('notifications');
  const formatTimeAgo = useFormatTimeAgo();
  const isUnread = !notification.readAt;
  const isLinkRequest = notification.type === 'link_request' && !notification.actedAt;

  return (
    <div
      className={`
        p-3 border-b border-gray-100 last:border-0 transition-colors
        ${isUnread ? 'bg-primary-50/50' : 'bg-white'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'} text-gray-900`}>
              {notification.title}
            </h4>
            {isUnread && !isLinkRequest && (
              <button
                onClick={onMarkRead}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={t('markAsRead')}
              >
                <Check size={14} />
              </button>
            )}
          </div>

          <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>

          {notification.data?.message ? (
            <p className="text-sm text-gray-500 italic mt-1 bg-gray-50 p-2 rounded-lg">
              "{String(notification.data.message)}"
            </p>
          ) : null}

          <p className="text-xs text-gray-400 mt-1">
            {formatTimeAgo(notification.createdAt)}
          </p>

          {/* Action buttons for link requests */}
          {isLinkRequest && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={onAccept}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-study hover:bg-study/90 rounded-lg transition-colors disabled:opacity-50"
              >
                <Check size={14} />
                {t('accept')}
              </button>
              <button
                onClick={onReject}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <X size={14} />
                {t('decline')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { t } = useTranslation('notifications');
  const { notifications, markAsRead, markAllAsRead, respondToLinkRequest, unreadCount } = useNotifications();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleAccept = async (notificationId: number, linkRequestId: number) => {
    setLoadingId(notificationId);
    try {
      await respondToLinkRequest(linkRequestId, 'accept');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (notificationId: number, linkRequestId: number) => {
    setLoadingId(notificationId);
    try {
      await respondToLinkRequest(linkRequestId, 'reject');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 mt-2 w-80 bg-white border-2 border-primary-100 rounded-xl shadow-clay overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-primary-50/50">
        <h3 className="font-bold text-primary-900">{t('title')}</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
          >
            <CheckCheck size={14} />
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('noNotifications')}</p>
          </div>
        ) : (
          notifications.slice(0, 10).map(notification => {
            // For link_request notifications, extract the link request ID from data
            const linkRequestData = notification.data as { linkRequestId?: number } | null;
            const linkRequestId = linkRequestData?.linkRequestId;

            return (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markAsRead(notification.id)}
                onAccept={
                  notification.type === 'link_request' && linkRequestId && !notification.actedAt
                    ? () => handleAccept(notification.id, linkRequestId)
                    : undefined
                }
                onReject={
                  notification.type === 'link_request' && linkRequestId && !notification.actedAt
                    ? () => handleReject(notification.id, linkRequestId)
                    : undefined
                }
                loading={loadingId === notification.id}
              />
            );
          })
        )}
      </div>

      {notifications.length > 10 && (
        <div className="px-4 py-2 border-t border-gray-100 text-center">
          <button
            onClick={onClose}
            className="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            {t('viewAll')}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default NotificationDropdown;
