import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/contexts';
import { colors } from '../src/theme';

export default function Index() {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (state.isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
