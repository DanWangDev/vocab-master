import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { useApp } from '../../contexts/AppContext';
import { colors } from '../../theme/colors';

export function OfflineIndicator() {
  const { t } = useTranslation('common');
  const { isOnline, pendingSyncCount, state } = useApp();

  if (isOnline && pendingSyncCount === 0 && !state.isSyncing) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
      {!isOnline && (
        <View className="flex-row items-center justify-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
          <WifiOff size={14} color={colors.warning} />
          <Text className="text-xs font-nunito-bold text-amber-700">
            {t('offlineMode', 'Offline Mode')}
          </Text>
          {pendingSyncCount > 0 && (
            <Text className="text-xs font-nunito text-amber-600">
              ({pendingSyncCount} {t('pendingSync', 'pending')})
            </Text>
          )}
        </View>
      )}

      {isOnline && state.isSyncing && (
        <View className="flex-row items-center justify-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200">
          <RefreshCw size={14} color={colors.info} />
          <Text className="text-xs font-nunito-bold text-blue-700">
            {t('syncing', 'Syncing...')}
          </Text>
        </View>
      )}

      {isOnline && !state.isSyncing && pendingSyncCount > 0 && (
        <View className="flex-row items-center justify-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
          <RefreshCw size={14} color={colors.warning} />
          <Text className="text-xs font-nunito text-amber-700">
            {pendingSyncCount} {t('pendingSync', 'pending')}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
