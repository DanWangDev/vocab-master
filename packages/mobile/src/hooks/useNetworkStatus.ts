import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isOnline: boolean;
  isWifi: boolean;
  connectionType: string | null;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    isWifi: false,
    connectionType: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isOnline: state.isConnected === true && state.isInternetReachable !== false,
        isWifi: state.type === 'wifi',
        connectionType: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    const online = state.isConnected === true && state.isInternetReachable !== false;
    setStatus({
      isOnline: online,
      isWifi: state.type === 'wifi',
      connectionType: state.type,
    });
    return online;
  }, []);

  return { ...status, checkConnection };
}
