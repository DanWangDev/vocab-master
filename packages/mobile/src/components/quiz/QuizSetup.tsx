import { useState } from 'react';
import { View, Text, Switch, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Play, Clock, Hash } from 'lucide-react-native';
import { Button } from '../common';
import { colors } from '../../theme/colors';
import type { QuizConfig } from '@vocab-master/shared';

interface QuizSetupProps {
  onStart: (config: QuizConfig) => void;
  maxQuestions: number;
}

const QUESTION_OPTIONS = [5, 10, 15, 20, 30, 50];
const TIME_OPTIONS = [10, 15, 20, 25, 30, 45, 60];

export function QuizSetup({ onStart, maxQuestions }: QuizSetupProps) {
  const { t } = useTranslation('quiz');
  const [questionCount, setQuestionCount] = useState(10);
  const [hasTimeLimit, setHasTimeLimit] = useState(true);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [autoAdvance, setAutoAdvance] = useState(false);

  const handleStart = () => {
    onStart({
      totalQuestions: questionCount,
      timePerQuestion: hasTimeLimit ? timePerQuestion : null,
      autoAdvance,
    });
  };

  const availableQuestions = QUESTION_OPTIONS.filter(n => n <= maxQuestions);

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View className="bg-white rounded-2xl p-6">
        <Text className="text-2xl font-bold text-gray-900 text-center mb-6">
          {t('settings')}
        </Text>

        {/* Number of questions */}
        <View className="mb-6">
          <View className="flex-row items-center gap-2 mb-3">
            <Hash size={16} color={colors.gray[700]} />
            <Text className="text-sm font-medium text-gray-700">
              {t('numQuestions')}
            </Text>
            <Text className="font-bold text-pink-500">{questionCount}</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {availableQuestions.map(n => (
              <Pressable
                key={n}
                onPress={() => setQuestionCount(n)}
                className={`px-4 py-2 rounded-xl border-2 ${
                  questionCount === n
                    ? 'bg-pink-500 border-pink-500'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text
                  className={`font-bold ${
                    questionCount === n ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Time limit toggle */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <Clock size={16} color={colors.gray[700]} />
            <Text className="text-sm font-medium text-gray-700">
              {t('enableTimeLimit')}
            </Text>
          </View>
          <Switch
            value={hasTimeLimit}
            onValueChange={setHasTimeLimit}
            trackColor={{ false: colors.gray[300], true: colors.quiz.DEFAULT }}
            thumbColor="white"
          />
        </View>

        {/* Time per question */}
        {hasTimeLimit && (
          <View className="mb-6 ml-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Text className="text-sm font-medium text-gray-700">
                {t('secondsPerQuestion')}
              </Text>
              <Text className="font-bold text-pink-500">{timePerQuestion}s</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {TIME_OPTIONS.map(s => (
                <Pressable
                  key={s}
                  onPress={() => setTimePerQuestion(s)}
                  className={`px-3 py-2 rounded-xl border-2 ${
                    timePerQuestion === s
                      ? 'bg-pink-500 border-pink-500'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <Text
                    className={`font-bold text-sm ${
                      timePerQuestion === s ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {s}s
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Auto-advance option */}
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-sm text-gray-700">
            {t('autoAdvance')}
          </Text>
          <Switch
            value={autoAdvance}
            onValueChange={setAutoAdvance}
            trackColor={{ false: colors.gray[300], true: colors.quiz.DEFAULT }}
            thumbColor="white"
          />
        </View>

        {/* Start button */}
        <Button onPress={handleStart} color={colors.quiz.DEFAULT}>
          <View className="flex-row items-center justify-center gap-2">
            <Play size={20} color="white" />
            <Text className="text-white font-bold text-lg">{t('startQuiz')}</Text>
          </View>
        </Button>
      </View>
    </Animated.View>
  );
}
