import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Flame, Star, Zap } from 'lucide-react-native';
import type { ElementType } from 'react';

interface StreakMilestoneProps {
  streak: number;
  isVisible: boolean;
  onDismiss: () => void;
}

const milestoneConfig: Record<number, {
  Icon: ElementType;
  iconColor: string;
  bgClass: string;
  messageKey: string;
}> = {
  5: {
    Icon: Flame,
    iconColor: '#f97316',
    bgClass: 'bg-orange-500',
    messageKey: 'streak5',
  },
  10: {
    Icon: Zap,
    iconColor: '#eab308',
    bgClass: 'bg-yellow-500',
    messageKey: 'streak10',
  },
  15: {
    Icon: Star,
    iconColor: '#a855f7',
    bgClass: 'bg-purple-500',
    messageKey: 'streak15',
  },
  20: {
    Icon: Star,
    iconColor: '#ec4899',
    bgClass: 'bg-pink-500',
    messageKey: 'streak20',
  },
};

export function StreakMilestone({ streak, isVisible, onDismiss }: StreakMilestoneProps) {
  const { t } = useTranslation('challenge');
  const config = milestoneConfig[streak] || milestoneConfig[5];
  const { Icon } = config;

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isVisible) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        3,
        false
      );

      const timer = setTimeout(onDismiss, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isVisible, onDismiss, pulseScale]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  if (!isVisible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 z-50 items-center justify-center"
      pointerEvents="none"
    >
      {/* Backdrop */}
      <View className="absolute inset-0 bg-black/20" />

      {/* Icon container */}
      <Animated.View entering={ZoomIn.springify()}>
        {/* Glow ring */}
        <Animated.View
          style={glowStyle}
          className={`absolute w-32 h-32 -left-4 -top-4 rounded-full ${config.bgClass} opacity-30`}
        />

        {/* Main icon */}
        <View className={`w-24 h-24 rounded-full ${config.bgClass} items-center justify-center`}>
          <Icon size={48} color="white" />
        </View>

        {/* Streak number badge */}
        <View className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-white items-center justify-center shadow-lg">
          <Text className="text-lg font-bold" style={{ color: config.iconColor }}>
            {streak}
          </Text>
        </View>
      </Animated.View>

      {/* Message */}
      <Animated.Text
        entering={FadeIn.delay(300)}
        className="mt-8 text-2xl font-bold text-white"
        style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 }}
      >
        {t(config.messageKey as never)}
      </Animated.Text>
    </Animated.View>
  );
}
