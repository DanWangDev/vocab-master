import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { OptionButton } from './OptionButton';
import type { QuizQuestion } from '@vocab-master/shared';

interface QuestionCardProps {
  question: QuizQuestion;
  onAnswer: (answer: string) => void;
  showResult: boolean;
  selectedAnswer: string | null;
  disabled: boolean;
}

export function QuestionCard({
  question,
  onAnswer,
  showResult,
  selectedAnswer,
  disabled,
}: QuestionCardProps) {
  const { t } = useTranslation('quiz');
  const [localSelected, setLocalSelected] = useState<string | null>(null);

  useEffect(() => {
    setLocalSelected(null);
  }, [question.id]);

  useEffect(() => {
    setLocalSelected(selectedAnswer);
  }, [selectedAnswer]);

  const handleOptionPress = (option: string) => {
    if (disabled || showResult) return;
    setLocalSelected(option);
    onAnswer(option);
  };

  const getOptionState = (option: string) => {
    if (!showResult) {
      return localSelected === option ? 'selected' : 'default';
    }

    if (option === question.correctAnswer) {
      return 'correct';
    }

    if (localSelected === option && option !== question.correctAnswer) {
      return 'incorrect';
    }

    return 'default';
  };

  return (
    <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutUp.duration(200)}>
      {/* Prompt */}
      <View className="bg-white rounded-2xl border-2 border-teal-100 p-5 mb-5">
        <Text className="text-xs font-bold text-teal-500 uppercase tracking-wider mb-2">
          {question.promptType === 'synonym' ? t('synonym') : t('definition')}
        </Text>
        <Text className="text-lg text-teal-900 font-semibold leading-relaxed">
          {question.prompt}
        </Text>
      </View>

      {/* Options */}
      <View>
        {question.options.map((option, index) => (
          <OptionButton
            key={`${question.id}-${option}`}
            label={option}
            state={getOptionState(option) as 'default' | 'selected' | 'correct' | 'incorrect'}
            disabled={disabled || showResult}
            onPress={() => handleOptionPress(option)}
            index={index}
          />
        ))}
      </View>
    </Animated.View>
  );
}
