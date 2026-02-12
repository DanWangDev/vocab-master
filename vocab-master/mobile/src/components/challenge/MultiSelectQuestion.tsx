import { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Check, X, Send } from 'lucide-react-native';
import { Button } from '../common';
import { colors } from '../../theme/colors';
import { isMultiSelectCorrect } from '@vocab-master/shared';
import type { QuizQuestion } from '@vocab-master/shared';

interface MultiSelectQuestionProps {
  question: QuizQuestion;
  onAnswer: (answers: string[]) => void;
  showResult: boolean;
  userAnswers: string[] | null;
  disabled: boolean;
}

type OptionState = 'default' | 'selected' | 'correct' | 'incorrect' | 'missed';

const optionLabels = ['A', 'B', 'C', 'D'];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function OptionItem({
  option,
  state,
  index,
  showResult,
  disabled,
  onToggle,
}: {
  option: string;
  state: OptionState;
  index: number;
  showResult: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const isAnswered = state === 'correct' || state === 'incorrect' || state === 'missed';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  useEffect(() => {
    if (state === 'incorrect') {
      translateX.value = withSequence(
        withTiming(-8, { duration: 80 }),
        withTiming(8, { duration: 80 }),
        withTiming(-8, { duration: 80 }),
        withTiming(8, { duration: 80 }),
        withTiming(0, { duration: 80 }),
      );
    }
  }, [state, translateX]);

  const handlePressIn = () => {
    if (!disabled && !showResult) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const borderClass =
    state === 'correct' ? 'border-green-500' :
    state === 'incorrect' ? 'border-red-400' :
    state === 'missed' ? 'border-amber-400' :
    state === 'selected' ? 'border-teal-400' :
    'border-teal-100';

  const bgClass =
    state === 'correct' ? 'bg-green-50' :
    state === 'incorrect' ? 'bg-red-50' :
    state === 'missed' ? 'bg-amber-50' :
    state === 'selected' ? 'bg-teal-100' :
    'bg-white';

  const badgeBgClass =
    state === 'correct' ? 'bg-green-500' :
    state === 'incorrect' ? 'bg-red-500' :
    state === 'missed' ? 'bg-amber-500' :
    state === 'selected' ? 'bg-teal-500' :
    'bg-teal-50';

  const badgeTextClass =
    state === 'default' ? 'text-teal-600' : 'text-white';

  const labelTextClass =
    state === 'correct' ? 'text-green-800' :
    state === 'incorrect' ? 'text-red-700' :
    state === 'missed' ? 'text-amber-700' :
    state === 'selected' ? 'text-teal-900' :
    'text-teal-800';

  return (
    <AnimatedPressable
      onPress={onToggle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || showResult}
      style={animatedStyle}
      className={`
        w-full p-4 rounded-2xl border-2 mb-3
        ${borderClass} ${bgClass}
        ${disabled && state === 'default' ? 'opacity-60' : ''}
      `}
    >
      <View className="flex-row items-start gap-3">
        <View className={`w-9 h-9 rounded-xl items-center justify-center ${badgeBgClass}`}>
          {isAnswered ? (
            state === 'correct' || state === 'missed' ? (
              <Check size={20} strokeWidth={3} color="white" />
            ) : (
              <X size={20} strokeWidth={3} color="white" />
            )
          ) : (
            <Text className={`font-extrabold text-sm ${badgeTextClass}`}>
              {optionLabels[index]}
            </Text>
          )}
        </View>

        <Text className={`flex-1 font-semibold text-base leading-snug ${labelTextClass}`}>
          {option}
        </Text>

        {!showResult && state === 'selected' && (
          <Animated.View
            entering={ZoomIn.duration(200)}
            className="w-6 h-6 rounded-full bg-teal-500 items-center justify-center"
          >
            <Check size={16} strokeWidth={3} color="white" />
          </Animated.View>
        )}
      </View>
    </AnimatedPressable>
  );
}

export function MultiSelectQuestion({
  question,
  onAnswer,
  showResult,
  userAnswers,
  disabled,
}: MultiSelectQuestionProps) {
  const { t } = useTranslation('challenge');
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedOptions(new Set());
  }, [question.id]);

  const correctAnswers = question.correctAnswers || [question.correctAnswer];

  const toggleOption = (option: string) => {
    if (disabled || showResult) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedOptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(option)) {
        newSet.delete(option);
      } else {
        newSet.add(option);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    if (selectedOptions.size === 0 || disabled || showResult) return;
    onAnswer(Array.from(selectedOptions));
  };

  const getOptionState = (option: string): OptionState => {
    if (!showResult) {
      return selectedOptions.has(option) ? 'selected' : 'default';
    }

    const wasSelected = userAnswers?.includes(option) || false;
    const isCorrectOption = correctAnswers.includes(option);

    if (isCorrectOption && wasSelected) return 'correct';
    if (isCorrectOption && !wasSelected) return 'missed';
    if (!isCorrectOption && wasSelected) return 'incorrect';
    return 'default';
  };

  const isAllCorrect = userAnswers
    ? isMultiSelectCorrect(userAnswers, correctAnswers)
    : false;

  return (
    <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutUp.duration(200)}>
      {/* Prompt */}
      <View className="bg-white rounded-2xl p-6 mb-6">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {question.promptType === 'synonym'
            ? t('selectAllSynonyms')
            : t('selectAllDefinitions')}
        </Text>
        <Text className="text-2xl text-gray-900 font-bold text-center py-2">
          {question.prompt}
        </Text>
        <Text className="text-xs text-gray-400 text-center mt-2">
          {t('selectMultiple')}
        </Text>
      </View>

      {/* Options */}
      <View className="mb-4">
        {question.options.map((option, index) => (
          <OptionItem
            key={option}
            option={option}
            state={getOptionState(option)}
            index={index}
            showResult={showResult}
            disabled={disabled}
            onToggle={() => toggleOption(option)}
          />
        ))}
      </View>

      {/* Result summary */}
      {showResult && (
        <Animated.View
          entering={FadeIn.delay(200)}
          className={`p-4 rounded-xl border mb-4 ${
            isAllCorrect
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <View className="flex-row items-center gap-2">
            <View
              className={`w-8 h-8 rounded-full items-center justify-center ${
                isAllCorrect ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {isAllCorrect ? (
                <Check size={20} color="white" />
              ) : (
                <X size={20} color="white" />
              )}
            </View>
            <View>
              <Text
                className={`font-semibold ${
                  isAllCorrect ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {isAllCorrect ? t('perfect') : t('notQuiteRight')}
              </Text>
              {!isAllCorrect && (
                <Text className="text-sm text-gray-600">
                  {t('correctAnswersCount', {
                    correct: correctAnswers.length,
                    selected: userAnswers?.length || 0,
                  })}
                </Text>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      {/* Submit button */}
      {!showResult && (
        <Button
          onPress={handleSubmit}
          disabled={selectedOptions.size === 0 || disabled}
          color={colors.challenge.DEFAULT}
        >
          <View className="flex-row items-center justify-center gap-2">
            <Send size={20} color="white" />
            <Text className="text-white font-bold text-base">
              {t('submitAnswer', { count: selectedOptions.size })}
            </Text>
          </View>
        </Button>
      )}
    </Animated.View>
  );
}
