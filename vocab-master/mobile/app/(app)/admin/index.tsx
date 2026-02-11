import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-2xl font-nunito-bold text-gray-800 mb-2">
          Admin Panel
        </Text>
        <Text className="text-gray-500 font-nunito text-center">
          Coming in Phase 4
        </Text>
      </View>
    </SafeAreaView>
  );
}
