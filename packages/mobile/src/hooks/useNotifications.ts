import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { ApiService } from '../services/ApiService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications(isAuthenticated: boolean) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const router = useRouter();

  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (!Device.isDevice) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      setPermissionGranted(false);
      return null;
    }

    setPermissionGranted(true);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0d9488',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,
    });

    return tokenData.data;
  }, []);

  const registerToken = useCallback(async () => {
    const token = await registerForPushNotifications();
    if (!token) return;

    setExpoPushToken(token);

    try {
      const platform = Platform.OS as 'ios' | 'android';
      await ApiService.registerPushToken(token, platform);
    } catch (error) {
      console.error('Failed to register push token with server:', error);
    }
  }, [registerForPushNotifications]);

  const unregisterToken = useCallback(async () => {
    try {
      await ApiService.unregisterPushToken();
    } catch {
      // Best-effort unregister
    }
    setExpoPushToken(null);
  }, []);

  // Register when authenticated, unregister when logging out
  useEffect(() => {
    if (isAuthenticated) {
      registerToken();
    }
  }, [isAuthenticated, registerToken]);

  // Set up notification listeners
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Notification received while app is in foreground - no action needed
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'link_request') {
        router.push('/(app)');
      } else if (data?.type === 'link_accepted' || data?.type === 'link_rejected') {
        router.push('/(app)/parent');
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

  return {
    expoPushToken,
    permissionGranted,
    registerToken,
    unregisterToken,
  };
}
