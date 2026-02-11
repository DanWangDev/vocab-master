import { Pressable, View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import type { ElementType } from 'react';
import { shadows } from '../../theme';

interface ModeCardProps {
  title: string;
  description: string;
  icon: ElementType;
  color: 'study' | 'quiz' | 'challenge';
  onPress: () => void;
  badge?: string;
}

const colorMap = {
  study: {
    bg: ['#34d399', '#14b8a6'],
    gradient: '#0d9488',
  },
  quiz: {
    bg: ['#fbbf24', '#f97316'],
    gradient: '#ea580c',
  },
  challenge: {
    bg: ['#f43f5e', '#dc2626'],
    gradient: '#b91c1c',
  },
} as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ModeCard({
  title,
  description,
  icon: Icon,
  color,
  onPress,
  badge,
}: ModeCardProps) {
  const scale = useSharedValue(1);
  const config = colorMap[color];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        {
          backgroundColor: config.gradient,
          borderRadius: 24,
          padding: 24,
          ...shadows.lg,
        },
      ]}
    >
      <View className="flex-row items-center gap-5">
        {/* Icon */}
        <View
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <Icon size={32} color="white" strokeWidth={2.5} />
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl font-nunito-extrabold text-white">
              {title}
            </Text>
            {badge && (
              <View className="bg-white px-2.5 py-0.5 rounded-full">
                <Text className="text-xs font-nunito-extrabold text-gray-800 uppercase">
                  {badge}
                </Text>
              </View>
            )}
          </View>
          <Text
            className="mt-1 text-sm font-nunito-semibold"
            style={{ color: 'rgba(255,255,255,0.85)' }}
          >
            {description}
          </Text>
        </View>

        {/* Arrow */}
        <ChevronRight size={20} color="rgba(255,255,255,0.7)" strokeWidth={3} />
      </View>
    </AnimatedPressable>
  );
}
