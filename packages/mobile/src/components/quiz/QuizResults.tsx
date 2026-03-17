import { View, Text, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Trophy, RotateCcw, Home } from 'lucide-react-native';
import { Button } from '../common';
import { colors } from '../../theme/colors';
import { calculatePercentage, getGrade } from '@vocab-master/shared';
import type { QuizState } from '@vocab-master/shared';

interface QuizResultsProps {
  state: QuizState;
  onRestart: () => void;
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

export function QuizResults({ state, onRestart, onHome }: QuizResultsProps) {
  const { t } = useTranslation('quiz');
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
        {/* Score header */}
        <View className="items-center mb-8">
          <Animated.View
            entering={ZoomIn.delay(200).springify()}
            className="w-20 h-20 rounded-full bg-pink-100 items-center justify-center mb-4"
          >
            <Trophy size={40} color={colors.quiz.DEFAULT} />
          </Animated.View>

          <Animated.Text
            entering={FadeInDown.delay(300)}
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            {t('quizComplete')}
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.delay(400)}
            className={`text-6xl font-bold ${gradeColors[color] || 'text-gray-900'}`}
          >
            {grade}
          </Animated.Text>
        </View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(400)} className="flex-row gap-3 mb-8">
          <View className="flex-1 items-center p-3 bg-gray-50 rounded-xl">
            <Text className="text-2xl font-bold text-gray-900">{correctCount}</Text>
            <Text className="text-xs text-gray-500">{t('correct')}</Text>
          </View>
          <View className="flex-1 items-center p-3 bg-gray-50 rounded-xl">
            <Text className="text-2xl font-bold text-gray-900">
              {state.totalQuestions - correctCount}
            </Text>
            <Text className="text-xs text-gray-500">{t('incorrect')}</Text>
          </View>
          <View className="flex-1 items-center p-3 bg-gray-50 rounded-xl">
            <Text className="text-2xl font-bold text-gray-900">{percentage}%</Text>
            <Text className="text-xs text-gray-500">{t('score')}</Text>
          </View>
        </Animated.View>

        {/* Words to review */}
        {incorrectWords.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500)} className="mb-8">
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

        {/* Actions */}
        <View className="gap-3">
          <Button onPress={onRestart} color={colors.quiz.DEFAULT}>
            <View className="flex-row items-center justify-center gap-2">
              <RotateCcw size={20} color="white" />
              <Text className="text-white font-bold text-base">{t('tryAgain')}</Text>
            </View>
          </Button>
          <Button onPress={onHome} variant="ghost">
            <View className="flex-row items-center justify-center gap-2">
              <Home size={20} color={colors.gray[600]} />
              <Text className="text-gray-600 font-bold text-base">{t('backToHome')}</Text>
            </View>
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
