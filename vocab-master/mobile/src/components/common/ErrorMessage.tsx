import { View, Text } from 'react-native';

interface ErrorMessageProps {
  message: string | null;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <View className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
      <Text className="text-red-600 text-sm font-nunito">{message}</Text>
    </View>
  );
}
