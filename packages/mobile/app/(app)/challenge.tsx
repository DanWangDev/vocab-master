import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { AlertTriangle, Flame, Trophy } from 'lucide-react-native';
import { useApp } from '../../src/contexts/AppContext';
import { useTimer } from '../../src/hooks/useTimer';
import { useAudio } from '../../src/hooks/useAudio';
import { MultiSelectQuestion, ChallengeResults, StreakMilestone } from '../../src/components/challenge';
import { Timer, Button, OfflineIndicator } from '../../src/components/common';
import { ProgressBar } from '../../src/components/study/ProgressBar';
import { ApiService } from '../../src/services/ApiService';
import { OfflineSyncService } from '../../src/services/OfflineSyncService';
import { StorageService } from '../../src/services/StorageService';
import { colors } from '../../src/theme/colors';
import {
  generateDailyChallengeQuestions,
  calculatePoints,
  isMultiSelectCorrect,
  getTodayString,
} from '@vocab-master/shared';
import type { DailyChallengeState, AnswerRecord, QuizQuestion } from '@vocab-master/shared';

const CHALLENGE_QUESTIONS = 20;
const TIME_PER_QUESTION = 25;
const STREAK_MILESTONES = [5, 10, 15, 20];

export default function ChallengeScreen() {
  const { t } = useTranslation(['challenge', 'wordlists']);
  const router = useRouter();
  const { vocabulary, loadUserData } = useApp();
  const { playSuccess, playError, playClick, playWarning, playComplete } = useAudio();

  const [state, setState] = useState<DailyChallengeState>({
    questions: [],
    currentIndex: 0,
    score: 0,
    timePerQuestion: TIME_PER_QUESTION,
    totalQuestions: CHALLENGE_QUESTIONS,
    answers: [],
    status: 'intro',
    pointsEarned: 0,
    streak: 0,
    todayCompleted: false,
  });

  const [milestoneStreak, setMilestoneStreak] = useState<number | null>(null);
  const answerTimeRef = useRef(Date.now());

  // Check if today's challenge is already completed
  useEffect(() => {
    StorageService.hasTodayChallenge().then(completed => {
      if (completed) {
        setState(prev => ({ ...prev, todayCompleted: true }));
      }
    });
  }, []);

  const timer = useTimer({
    initialTime: TIME_PER_QUESTION,
    onComplete: () => {
      if (state.status === 'active') {
        handleTimeUp();
      }
    },
    autoStart: false,
  });

  const currentQuestion: QuizQuestion | null = state.questions[state.currentIndex] || null;
  const currentAnswer = state.answers.find(a => a.questionId === currentQuestion?.id);

  // Start timer when question changes
  useEffect(() => {
    if (state.status === 'active') {
      timer.restart(TIME_PER_QUESTION);
      answerTimeRef.current = Date.now();
    } else {
      timer.pause();
    }
  }, [state.status, state.currentIndex]);

  const startChallenge = useCallback(() => {
    const questions = generateDailyChallengeQuestions(vocabulary, CHALLENGE_QUESTIONS);
    setState(prev => ({
      ...prev,
      questions,
      currentIndex: 0,
      score: 0,
      answers: [],
      status: 'active',
      pointsEarned: 0,
      streak: 0,
    }));
    playClick();
  }, [vocabulary, playClick]);

  const handleTimeUp = useCallback(() => {
    if (!currentQuestion) return;

    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      selectedAnswer: null,
      selectedAnswers: [],
      isCorrect: false,
      timeSpent: TIME_PER_QUESTION * 1000,
    };

    setState(prev => ({
      ...prev,
      answers: [...prev.answers, record],
      streak: 0,
      status: 'review',
    }));

    playError();
  }, [currentQuestion, playError]);

  const handleAnswer = useCallback(
    (answers: string[]) => {
      if (state.status !== 'active' || !currentQuestion) return;

      timer.pause();
      const timeSpent = Date.now() - answerTimeRef.current;
      const timeRemaining = timer.timeRemaining;

      const correctAnswers = currentQuestion.correctAnswers || [currentQuestion.correctAnswer];
      const isCorrect = isMultiSelectCorrect(answers, correctAnswers);
      const newStreak = isCorrect ? state.streak + 1 : 0;

      const points = calculatePoints({
        isCorrect,
        timeRemaining,
        totalTime: TIME_PER_QUESTION,
        streak: state.streak,
      });

      const record: AnswerRecord = {
        questionId: currentQuestion.id,
        selectedAnswer: answers.join(', '),
        selectedAnswers: answers,
        isCorrect,
        timeSpent,
      };

      setState(prev => ({
        ...prev,
        answers: [...prev.answers, record],
        score: isCorrect ? prev.score + 1 : prev.score,
        pointsEarned: prev.pointsEarned + points,
        streak: newStreak,
        status: 'review',
      }));

      if (isCorrect) {
        playSuccess();
        if (STREAK_MILESTONES.includes(newStreak)) {
          setMilestoneStreak(newStreak);
        }
      } else {
        playError();
      }
    },
    [state.status, state.streak, currentQuestion, timer, playSuccess, playError]
  );

  const handleNext = useCallback(() => {
    playClick();
    setState(prev => {
      if (prev.currentIndex >= prev.totalQuestions - 1) {
        playComplete();

        // Save completion
        StorageService.setDailyChallengeDate(getTodayString());

        const totalTimeSpent = prev.answers.reduce((acc, curr) => acc + curr.timeSpent, 0);

        const resultData = {
          quizType: 'challenge' as const,
          totalQuestions: prev.totalQuestions,
          correctAnswers: prev.score,
          score: prev.pointsEarned,
          timePerQuestion: prev.timePerQuestion,
          totalTimeSpent,
          pointsEarned: prev.pointsEarned,
          answers: prev.answers.map(a => {
            const q = prev.questions.find(q => q.id === a.questionId)!;
            return {
              questionIndex: prev.questions.indexOf(q),
              word: q.word.targetWord,
              promptType: q.promptType,
              questionFormat: 'multi-select',
              correctAnswer: (q.correctAnswers || [q.correctAnswer]).join(', '),
              selectedAnswer: a.selectedAnswers?.join(', ') || a.selectedAnswer,
              isCorrect: a.isCorrect,
              timeSpent: a.timeSpent,
            };
          }),
        };

        ApiService.saveQuizResult(resultData).catch(() => {
          OfflineSyncService.queueRequest(
            'save_quiz_result',
            '/quiz-results',
            'POST',
            resultData
          );
        });

        return { ...prev, status: 'complete', todayCompleted: true };
      }
      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        status: 'active',
      };
    });
  }, [playClick, playComplete]);

  const handleHome = async () => {
    playClick();
    if (state.status === 'complete') {
      await loadUserData();
    }
    router.back();
  };

  // Guard: need at least 4 words
  if (vocabulary.length < 4) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center p-8">
          <AlertTriangle size={48} color={colors.warning} />
          <Text className="text-gray-700 font-nunito-bold text-center mt-4 mb-6">
            {t('wordlists:minWordsChallenge')}
          </Text>
          <Button onPress={() => router.back()} color={colors.challenge.DEFAULT}>
            <Text className="text-white font-nunito-bold text-base">
              {t('challenge:backToHome', 'Back to Home')}
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Intro screen
  if (state.status === 'intro') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="bg-white rounded-2xl p-8 items-center"
          >
            <Animated.View
              entering={ZoomIn.delay(200).springify()}
              className="w-20 h-20 rounded-full bg-amber-400 items-center justify-center mb-6"
            >
              <Trophy size={40} color="white" />
            </Animated.View>

            <Text className="text-2xl font-nunito-bold text-gray-900 mb-2">
              {t('challenge:title')}
            </Text>
            <Text className="text-gray-500 font-nunito text-center mb-6">
              {t('challenge:description')}
            </Text>

            <View className="flex-row gap-4 mb-8 w-full">
              <View className="flex-1 items-center p-4 bg-gray-50 rounded-xl">
                <Text className="text-2xl font-nunito-bold text-gray-900">20</Text>
                <Text className="text-xs text-gray-500 font-nunito">{t('challenge:questions')}</Text>
              </View>
              <View className="flex-1 items-center p-4 bg-gray-50 rounded-xl">
                <Text className="text-2xl font-nunito-bold text-gray-900">25s</Text>
                <Text className="text-xs text-gray-500 font-nunito">{t('challenge:perQuestion')}</Text>
              </View>
            </View>

            {state.todayCompleted ? (
              <>
                <View className="w-full p-4 bg-green-50 rounded-xl border border-green-200 mb-4">
                  <Text className="text-green-700 font-nunito-bold text-center">
                    {t('challenge:completedToday')}
                  </Text>
                  <Text className="text-sm text-green-600 text-center mt-1 font-nunito">
                    {t('challenge:comeBackTomorrow')}
                  </Text>
                </View>
                <Button onPress={handleHome} variant="ghost">
                  <Text className="text-gray-600 font-nunito-bold text-base">
                    {t('challenge:backToHome')}
                  </Text>
                </Button>
              </>
            ) : (
              <Button onPress={startChallenge} color={colors.challenge.DEFAULT}>
                <View className="flex-row items-center justify-center gap-2">
                  <Flame size={20} color="white" />
                  <Text className="text-white font-nunito-bold text-lg">
                    {t('challenge:startChallenge')}
                  </Text>
                </View>
              </Button>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Results screen
  if (state.status === 'complete') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <ChallengeResults state={state} onHome={handleHome} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Active challenge
  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <OfflineIndicator />
      {/* Streak milestone */}
      <StreakMilestone
        streak={milestoneStreak ?? 0}
        isVisible={milestoneStreak !== null}
        onDismiss={() => setMilestoneStreak(null)}
      />

      <View className="flex-1 p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-nunito-bold text-gray-500">
            {t('challenge:questionCount', {
              current: state.currentIndex + 1,
              total: state.totalQuestions,
            })}
          </Text>

          <View className="flex-row items-center gap-3">
            {state.streak > 0 && (
              <Animated.View
                entering={ZoomIn.duration(200)}
                className="flex-row items-center gap-1 px-2 py-1 bg-orange-100 rounded-full"
              >
                <Flame size={16} color={colors.challenge.DEFAULT} />
                <Text className="text-sm font-nunito-bold text-orange-600">{state.streak}</Text>
              </Animated.View>
            )}

            <Timer
              timeRemaining={timer.timeRemaining}
              totalTime={TIME_PER_QUESTION}
              onWarning={playWarning}
            />
          </View>
        </View>

        <ProgressBar
          current={state.currentIndex + 1}
          total={state.totalQuestions}
          color={colors.challenge.DEFAULT}
        />

        {/* Points */}
        <Animated.View entering={FadeIn} className="items-center my-3">
          <Text className="text-sm text-gray-500 font-nunito">
            {t('challenge:points')}{' '}
            <Text className="font-nunito-bold text-amber-600">{state.pointsEarned}</Text>
          </Text>
        </Animated.View>

        {/* Question */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {currentQuestion && (
            <MultiSelectQuestion
              question={currentQuestion}
              onAnswer={handleAnswer}
              showResult={state.status === 'review'}
              userAnswers={currentAnswer?.selectedAnswers || null}
              disabled={state.status === 'review'}
            />
          )}

          {state.status === 'review' && (
            <Animated.View entering={FadeIn.delay(200)} className="mt-4 mb-8">
              <Button onPress={handleNext} color={colors.challenge.DEFAULT}>
                <Text className="text-white font-nunito-bold text-base text-center">
                  {state.currentIndex >= state.totalQuestions - 1
                    ? t('challenge:seeResults')
                    : t('challenge:nextQuestion')}
                </Text>
              </Button>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
