import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { useApp } from '../../src/contexts/AppContext';
import { useQuiz } from '../../src/hooks/useQuiz';
import { useTimer } from '../../src/hooks/useTimer';
import { useAudio } from '../../src/hooks/useAudio';
import { QuizSetup, QuestionCard, QuizResults } from '../../src/components/quiz';
import { Timer, Button, OfflineIndicator } from '../../src/components/common';
import { ProgressBar } from '../../src/components/study/ProgressBar';
import { ApiService } from '../../src/services/ApiService';
import { OfflineSyncService } from '../../src/services/OfflineSyncService';
import { colors } from '../../src/theme/colors';
import type { QuizConfig } from '@vocab-master/shared';

const DEFAULT_CONFIG: QuizConfig = {
  totalQuestions: 10,
  timePerQuestion: 30,
  autoAdvance: false,
};

export default function QuizScreen() {
  const { t } = useTranslation(['quiz', 'wordlists']);
  const router = useRouter();
  const { vocabulary, loadUserData } = useApp();
  const { playSuccess, playError, playClick, playWarning } = useAudio();

  const [config, setConfig] = useState<QuizConfig>(DEFAULT_CONFIG);

  const {
    state,
    currentQuestion,
    startQuiz,
    submitAnswer,
    nextQuestion,
    resetQuiz,
    isLastQuestion,
  } = useQuiz(vocabulary, config);

  const answerTimeRef = useRef(Date.now());
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timer = useTimer({
    initialTime: config.timePerQuestion ?? 30,
    onComplete: () => {
      if (config.timePerQuestion !== null && state.status === 'active' && currentQuestion) {
        submitAnswer('', config.timePerQuestion * 1000);
        playError();
      }
    },
    autoStart: false,
  });

  // Start/restart timer when question changes
  useEffect(() => {
    if (state.status === 'active') {
      answerTimeRef.current = Date.now();
      if (config.timePerQuestion !== null) {
        timer.restart(config.timePerQuestion);
      }
    } else {
      timer.pause();
    }
  }, [state.status, state.currentIndex, config.timePerQuestion]);

  // Save results when quiz completes
  useEffect(() => {
    if (state.status === 'complete') {
      const totalTimeSpent = state.answers.reduce((acc, curr) => acc + curr.timeSpent, 0);

      const resultData = {
        quizType: 'quiz' as const,
        totalQuestions: state.totalQuestions,
        correctAnswers: state.score,
        score: state.score,
        timePerQuestion: config.timePerQuestion,
        totalTimeSpent,
        pointsEarned: 0,
        answers: state.answers.map(a => {
          const q = state.questions.find(q => q.id === a.questionId)!;
          return {
            questionIndex: state.questions.indexOf(q),
            word: q.word.targetWord,
            promptType: 'definition',
            questionFormat: q.format || 'multiple-choice',
            correctAnswer: q.correctAnswer,
            selectedAnswer: a.selectedAnswer,
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
    }
  }, [state.status]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (state.status !== 'active') return;

      timer.pause();
      const timeSpent = Date.now() - answerTimeRef.current;
      const isCorrect = submitAnswer(answer, timeSpent);

      if (isCorrect) {
        playSuccess();
      } else {
        playError();
      }

      if (config.autoAdvance) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          handleNext();
        }, 2000);
      }
    },
    [state.status, submitAnswer, config.autoAdvance, playSuccess, playError, timer]
  );

  const handleNext = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    playClick();
    nextQuestion();
  }, [nextQuestion, playClick]);

  const handleStart = (newConfig: QuizConfig) => {
    setConfig(newConfig);
    playClick();
    startQuiz(newConfig);
  };

  const handleRestart = () => {
    playClick();
    resetQuiz();
  };

  const handleHome = async () => {
    playClick();
    if (state.status === 'complete') {
      await loadUserData();
    }
    router.back();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const currentAnswer = state.answers.find(a => a.questionId === currentQuestion?.id);

  // Guard: need at least 4 words
  if (vocabulary.length < 4) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center p-8">
          <AlertTriangle size={48} color={colors.warning} />
          <Text className="text-gray-700 font-nunito-bold text-center mt-4 mb-6">
            {t('wordlists:minWordsQuiz')}
          </Text>
          <Button onPress={() => router.back()} color={colors.quiz.DEFAULT}>
            <Text className="text-white font-nunito-bold text-base">
              {t('quiz:backToHome', 'Back to Home')}
            </Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <OfflineIndicator />
      {/* Setup screen */}
      {state.status === 'setup' && (
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <QuizSetup onStart={handleStart} maxQuestions={vocabulary.length} />
        </ScrollView>
      )}

      {/* Active quiz */}
      {(state.status === 'active' || state.status === 'review') && currentQuestion && (
        <View className="flex-1 p-4">
          {/* Header: progress + timer */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-nunito-bold text-gray-500">
              {t('quiz:questionCount', {
                current: state.currentIndex + 1,
                total: state.totalQuestions,
              })}
            </Text>
            {config.timePerQuestion !== null && (
              <Timer
                timeRemaining={timer.timeRemaining}
                totalTime={config.timePerQuestion}
                onWarning={playWarning}
              />
            )}
          </View>

          <ProgressBar
            current={state.currentIndex + 1}
            total={state.totalQuestions}
            color={colors.quiz.DEFAULT}
          />

          <ScrollView
            className="flex-1 mt-4"
            showsVerticalScrollIndicator={false}
          >
            <QuestionCard
              question={currentQuestion}
              onAnswer={handleAnswer}
              showResult={state.status === 'review'}
              selectedAnswer={currentAnswer?.selectedAnswer || null}
              disabled={state.status === 'review'}
            />

            {state.status === 'review' && (
              <Animated.View entering={FadeIn.delay(200)} className="mt-4">
                <Button onPress={handleNext} color={colors.quiz.DEFAULT}>
                  <Text className="text-white font-nunito-bold text-base text-center">
                    {isLastQuestion ? t('quiz:seeResults') : t('quiz:nextQuestion')}
                  </Text>
                </Button>
              </Animated.View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Results screen */}
      {state.status === 'complete' && (
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <QuizResults state={state} onRestart={handleRestart} onHome={handleHome} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
