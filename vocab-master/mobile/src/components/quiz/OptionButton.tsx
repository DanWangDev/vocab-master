import { Pressable, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Check, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';

type OptionState = 'default' | 'selected' | 'correct' | 'incorrect';

interface OptionButtonProps {
  label: string;
  state: OptionState;
  disabled: boolean;
  onPress: () => void;
  index: number;
}

const optionLabels = ['A', 'B', 'C', 'D'];

const stateConfig: Record<OptionState, {
  border: string;
  bg: string;
  badgeBg: string;
  badgeText: string;
  labelText: string;
}> = {
  default: {
    border: 'border-teal-100',
    bg: 'bg-white',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-600',
    labelText: 'text-teal-800',
  },
  selected: {
    border: 'border-teal-400',
    bg: 'bg-teal-100',
    badgeBg: 'bg-teal-500',
    badgeText: 'text-white',
    labelText: 'text-teal-900',
  },
  correct: {
    border: 'border-green-500',
    bg: 'bg-green-50',
    badgeBg: 'bg-green-500',
    badgeText: 'text-white',
    labelText: 'text-green-800',
  },
  incorrect: {
    border: 'border-red-400',
    bg: 'bg-red-50',
    badgeBg: 'bg-red-500',
    badgeText: 'text-white',
    labelText: 'text-red-700',
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OptionButton({
  label,
  state,
  disabled,
  onPress,
  index,
}: OptionButtonProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const isAnswered = state === 'correct' || state === 'incorrect';
  const config = stateConfig[state];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  if (state === 'correct') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  if (state === 'incorrect') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    translateX.value = withSequence(
      withTiming(-8, { duration: 80 }),
      withTiming(8, { duration: 80 }),
      withTiming(-8, { duration: 80 }),
      withTiming(8, { duration: 80 }),
      withTiming(0, { duration: 80 }),
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={animatedStyle}
      className={`
        w-full p-4 rounded-2xl border-2 mb-3
        ${config.border} ${config.bg}
        ${disabled && state === 'default' ? 'opacity-60' : ''}
      `}
    >
      <View className="flex-row items-center gap-3">
        <View className={`w-9 h-9 rounded-xl items-center justify-center ${config.badgeBg}`}>
          {isAnswered ? (
            state === 'correct' ? (
              <Check size={20} strokeWidth={3} color="white" />
            ) : (
              <X size={20} strokeWidth={3} color="white" />
            )
          ) : (
            <Text className={`font-extrabold text-sm ${config.badgeText}`}>
              {optionLabels[index]}
            </Text>
          )}
        </View>

        <Text className={`flex-1 font-semibold text-base ${config.labelText}`}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}
