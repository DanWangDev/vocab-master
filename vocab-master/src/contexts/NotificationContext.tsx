import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import ApiService from '../services/ApiService';
import type { Notification, LinkRequest } from '../services/ApiService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  linkRequests: LinkRequest[];
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  fetchLinkRequests: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  respondToLinkRequest: (id: number, action: 'accept' | 'reject') => Promise<void>;
  cancelLinkRequest: (id: number) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const POLL_INTERVAL = 30000; // 30 seconds
const MAX_POLL_FAILURES = 5;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { state: authState } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [linkRequests, setLinkRequests] = useState<LinkRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollFailures, setPollFailures] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!authState.isAuthenticated) return;

    try {
      const response = await ApiService.getNotifications();
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    }
  }, [authState.isAuthenticated]);

  const fetchNotificationCount = useCallback(async () => {
    if (!authState.isAuthenticated) return;

    try {
      const response = await ApiService.getNotificationCount();
      setUnreadCount(response.count);
      setPollFailures(0); // Reset on success
    } catch {
      setPollFailures(prev => Math.min(prev + 1, MAX_POLL_FAILURES));
    }
  }, [authState.isAuthenticated]);

  const fetchLinkRequests = useCallback(async () => {
    if (!authState.isAuthenticated) return;

    try {
      const response = await ApiService.getLinkRequests();
      setLinkRequests(response.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch link requests');
    }
  }, [authState.isAuthenticated]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchNotifications(), fetchLinkRequests()]);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications, fetchLinkRequests]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await ApiService.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await ApiService.markAllNotificationsRead();
      setNotifications(prev =>
        prev.map(n => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  }, []);

  const respondToLinkRequest = useCallback(async (id: number, action: 'accept' | 'reject') => {
    try {
      await ApiService.respondToLinkRequest(id, action);
      // Remove the request from the list
      setLinkRequests(prev => prev.filter(r => r.id !== id));
      // Refresh notifications to get the updated list
      await fetchNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to respond to link request');
      throw err;
    }
  }, [fetchNotifications]);

  const cancelLinkRequest = useCallback(async (id: number) => {
    try {
      await ApiService.cancelLinkRequest(id);
      // Remove the request from the list
      setLinkRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel link request');
      throw err;
    }
  }, []);

  // Initial fetch when authenticated
  useEffect(() => {
    if (authState.isAuthenticated) {
      refreshAll();
    } else {
      // Clear state when logged out
      setNotifications([]);
      setUnreadCount(0);
      setLinkRequests([]);
      setError(null);
    }
  }, [authState.isAuthenticated, refreshAll]);

  // Poll for notification count with exponential backoff on failures
  useEffect(() => {
    if (!authState.isAuthenticated || pollFailures >= MAX_POLL_FAILURES) return;

    // Exponential backoff: 30s, 60s, 120s, 240s, 480s
    const delay = POLL_INTERVAL * Math.pow(2, pollFailures);
    const interval = setInterval(fetchNotificationCount, delay);
    return () => clearInterval(interval);
  }, [authState.isAuthenticated, fetchNotificationCount, pollFailures]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        linkRequests,
        loading,
        error,
        fetchNotifications,
        fetchLinkRequests,
        markAsRead,
        markAllAsRead,
        respondToLinkRequest,
        cancelLinkRequest,
        refreshAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
