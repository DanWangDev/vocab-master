import { View } from 'react-native';

interface ProgressBarProps {
  current: number;
  total: number;
  color?: string;
}

export function ProgressBar({ current, total, color = '#3b82f6' }: ProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <View
        className="h-full rounded-full"
        style={{
          width: `${percentage}%`,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
