import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { VocabularyWord } from '@vocab-master/shared';
import { getRandomElement } from '@vocab-master/shared';
import { useTranslation } from 'react-i18next';
import { shadows } from '../../theme';

interface FlashCardProps {
  word: VocabularyWord;
  isFlipped: boolean;
  onFlip: () => void;
}

export function FlashCard({ word, isFlipped, onFlip }: FlashCardProps) {
  const { t } = useTranslation('study');
  const rotation = useSharedValue(0);

  const exampleSentence = useMemo(() => {
    return word.exampleSentence.length > 0
      ? getRandomElement(word.exampleSentence)
      : null;
  }, [word]);

  // Animate rotation when isFlipped changes
  rotation.value = withTiming(isFlipped ? 180 : 0, {
    duration: 600,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden' as const,
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    };
  });

  return (
    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onFlip(); }} style={{ height: 400 }}>
      <View style={{ flex: 1 }}>
        {/* Front - Word */}
        <Animated.View
          style={[
            frontAnimatedStyle,
            {
              backgroundColor: 'white',
              borderRadius: 24,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
              ...shadows.lg,
            },
          ]}
        >
          <Text className="text-4xl font-nunito-extrabold text-gray-900 text-center">
            {word.targetWord}
          </Text>
          <Text className="mt-6 text-sm font-nunito text-gray-400">
            {t('clickToFlip')}
          </Text>
        </Animated.View>

        {/* Back - Definition */}
        <Animated.View
          style={[
            backAnimatedStyle,
            {
              backgroundColor: 'white',
              borderRadius: 24,
              padding: 24,
              ...shadows.lg,
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Definitions */}
            <Text className="text-xs font-nunito-semibold text-gray-400 uppercase tracking-wide mb-2">
              {t('definition')}
            </Text>
            {word.definition.map((def, index) => (
              <View key={index} className="flex-row items-start gap-2 mb-2">
                <Text className="text-primary-500 mt-0.5">•</Text>
                <Text className="text-gray-700 text-base font-nunito flex-1">
                  {def}
                </Text>
              </View>
            ))}

            {/* Synonyms */}
            {word.synonyms.length > 0 && (
              <View className="mt-4">
                <Text className="text-xs font-nunito-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {t('synonyms')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {word.synonyms.map((synonym, index) => (
                    <View
                      key={index}
                      className="px-3 py-1 bg-primary-100 rounded-full"
                    >
                      <Text className="text-primary-700 text-sm font-nunito-semibold">
                        {synonym}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Example */}
            {exampleSentence && (
              <View className="mt-4">
                <Text className="text-xs font-nunito-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {t('example')}
                </Text>
                <Text className="text-gray-600 text-base font-nunito italic">
                  "{exampleSentence}"
                </Text>
              </View>
            )}
          </ScrollView>

          <Text className="mt-3 text-xs font-nunito text-gray-400 text-center">
            {t('clickToFlipBack')}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}
