import { View, Text, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeInLeft, FadeInRight, FadeIn, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Trophy, Star, Zap, Home } from 'lucide-react-native';
import { Button } from '../common';
import { colors } from '../../theme/colors';
import { calculatePercentage, getGrade } from '@vocab-master/shared';
import type { DailyChallengeState } from '@vocab-master/shared';

interface ChallengeResultsProps {
  state: DailyChallengeState;
  onHome: () => void;
}

const gradeColors: Record<string, string> = {
  'text-green-600': 'text-green-600',
  'text-green-500': 'text-green-500',
  'text-blue-500': 'text-blue-500',
  'text-yellow-500': 'text-yellow-500',
  'text-orange-500': 'text-orange-500',
  'text-red-500': 'text-red-500',
};

export function ChallengeResults({ state, onHome }: ChallengeResultsProps) {
  const { t } = useTranslation('challenge');
  const correctCount = state.answers.filter(a => a.isCorrect).length;
  const percentage = calculatePercentage(correctCount, state.totalQuestions);
  const { grade, color } = getGrade(percentage);

  const incorrectWords = state.answers
    .filter(a => !a.isCorrect)
    .map(a => {
      const question = state.questions.find(q => q.id === a.questionId);
      return question?.word.targetWord;
    })
    .filter(Boolean);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="bg-white rounded-2xl p-6">
        {/* Trophy animation */}
        <View className="items-center mb-6">
          <Animated.View
            entering={ZoomIn.delay(200).springify()}
            className="w-24 h-24 rounded-full bg-amber-400 items-center justify-center mb-4"
          >
            <Trophy size={48} color="white" />
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(300)}
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            {t('challengeComplete')}
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.delay(400)}
            className={`text-6xl font-bold ${gradeColors[color] || 'text-gray-900'}`}
          >
            {grade}
          </Animated.Text>
        </View>

        {/* Score breakdown */}
        <View className="flex-row gap-4 mb-6">
          <Animated.View
            entering={FadeInLeft.delay(500)}
            className="flex-1 items-center p-4 bg-amber-50 rounded-xl"
          >
            <View className="flex-row items-center gap-1 mb-1">
              <Star size={20} color={colors.challenge.DEFAULT} />
              <Text className="text-3xl font-bold text-amber-600">
                {state.pointsEarned}
              </Text>
            </View>
            <Text className="text-xs text-amber-700 font-medium">{t('totalPoints')}</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInRight.delay(500)}
            className="flex-1 items-center p-4 bg-amber-50 rounded-xl"
          >
            <View className="flex-row items-center gap-1 mb-1">
              <Zap size={20} color={colors.challenge.DEFAULT} />
              <Text className="text-3xl font-bold text-amber-600">
                {correctCount}/{state.totalQuestions}
              </Text>
            </View>
            <Text className="text-xs text-amber-700 font-medium">Correct</Text>
          </Animated.View>
        </View>

        {/* Accuracy */}
        <Animated.View
          entering={FadeIn.delay(600)}
          className="items-center p-4 bg-gray-50 rounded-xl mb-6"
        >
          <Text className="text-4xl font-bold text-gray-900">{percentage}%</Text>
          <Text className="text-sm text-gray-500">{t('accuracy')}</Text>
        </Animated.View>

        {/* Words to review */}
        {incorrectWords.length > 0 && (
          <Animated.View entering={FadeInDown.delay(700)} className="mb-6">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {t('wordsToReview')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {incorrectWords.map((word, index) => (
                <View key={index} className="px-3 py-1 bg-red-50 rounded-full">
                  <Text className="text-sm font-medium text-red-700">{word}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Perfect score message */}
        {percentage === 100 && (
          <Animated.View
            entering={FadeInDown.delay(700)}
            className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200"
          >
            <Text className="text-center text-green-700 font-semibold">
              {t('perfectScore')}
            </Text>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View entering={FadeIn.delay(800)}>
          <Button onPress={onHome} color={colors.challenge.DEFAULT}>
            <View className="flex-row items-center justify-center gap-2">
              <Home size={20} color="white" />
              <Text className="text-white font-bold text-base">{t('backToHome')}</Text>
            </View>
          </Button>
          <Text className="text-center text-xs text-gray-400 mt-3">
            {t('comeBackTomorrowShort')}
          </Text>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
