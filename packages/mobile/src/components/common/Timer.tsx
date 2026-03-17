import { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  onWarning?: () => void;
}

export function Timer({ timeRemaining, totalTime, onWarning }: TimerProps) {
  const warningFiredRef = useRef(false);
  const progress = useSharedValue(1);

  const ratio = totalTime > 0 ? timeRemaining / totalTime : 0;
  const isWarning = timeRemaining <= 5 && timeRemaining > 0;
  const isDanger = timeRemaining <= 3;

  useEffect(() => {
    progress.value = withTiming(ratio, { duration: 900 });
  }, [ratio, progress]);

  useEffect(() => {
    if (isWarning && !warningFiredRef.current) {
      warningFiredRef.current = true;
      onWarning?.();
    }
    if (timeRemaining > 5) {
      warningFiredRef.current = false;
    }
  }, [isWarning, timeRemaining, onWarning]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const barColor = isDanger
    ? colors.error
    : isWarning
      ? colors.warning
      : colors.primary[500];

  const textColor = isDanger
    ? 'text-red-600'
    : isWarning
      ? 'text-amber-600'
      : 'text-gray-700';

  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <View className="flex-row items-center gap-2">
      <View className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <Animated.View
          style={[barStyle, { backgroundColor: barColor }]}
          className="h-full rounded-full"
        />
      </View>
      <Text className={`text-sm font-bold ${textColor} min-w-[36px]`}>
        {display}
      </Text>
    </View>
  );
}
