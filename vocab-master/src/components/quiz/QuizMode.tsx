import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { Timer, ProgressBar, Button } from '../common';
import { QuizSetup } from './QuizSetup';
import { UserMenu } from '../common/UserMenu';
import { NotificationBell } from '../notifications/NotificationBell';
import { QuestionCard } from './QuestionCard';
import { QuizResults } from './QuizResults';
import { useApp } from '../../contexts/AppContext';
import { useQuiz } from '../../hooks/useQuiz';
import { useTimer } from '../../hooks/useTimer';
import { useAudio } from '../../hooks/useAudio';
import type { QuizConfig } from '../../types';

export function QuizMode() {
  const { t } = useTranslation(['quiz', 'wordlists']);
  const { vocabulary, loadUserData } = useApp();
  const { playSuccess, playError, playClick, playWarning } = useAudio();
  const navigate = useNavigate();

  const [config, setConfig] = useState<QuizConfig>({
    totalQuestions: 10,
    timePerQuestion: 30,
    autoAdvance: false,
  });

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

  // Timer for current question (only used when time limit is set)
  const timer = useTimer({
    initialTime: config.timePerQuestion ?? 30,  // Default for hook, but won't be used if no limit
    onComplete: () => {
      if (config.timePerQuestion !== null && state.status === 'active' && currentQuestion) {
        // Time's up - mark as incorrect
        submitAnswer('', config.timePerQuestion * 1000);
        playError();
      }
    },
    autoStart: false,
  });

  // Start timer when question becomes active (only if time limit is set)
  useEffect(() => {
    if (state.status === 'active') {
      answerTimeRef.current = Date.now();
      if (config.timePerQuestion !== null) {
        timer.restart(config.timePerQuestion);
      }
    } else {
      timer.pause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.currentIndex, config.timePerQuestion]);

  // Save results when quiz is complete
  useEffect(() => {
    if (state.status === 'complete') {
      const saveResults = async () => {
        try {
          // Calculate total time
          const totalTimeSpent = state.answers.reduce((acc, curr) => acc + curr.timeSpent, 0);

          await import('../../services/ApiService').then(({ default: api }) => api.saveQuizResult({
            quizType: 'quiz',
            totalQuestions: state.totalQuestions,
            correctAnswers: state.score, // Score tracks correct answers in useQuiz
            score: state.score, // Simple count for now
            timePerQuestion: config.timePerQuestion,
            totalTimeSpent,
            pointsEarned: 0, // Quiz mode simple scoring
            answers: state.answers.map(a => {
              const q = state.questions.find(q => q.id === a.questionId)!;
              return {
                questionIndex: state.questions.indexOf(q),
                word: q.word.targetWord,
                promptType: 'definition', // Assuming standard quiz uses definition prompt
                questionFormat: q.format || 'multiple-choice',
                correctAnswer: q.correctAnswer,
                selectedAnswer: a.selectedAnswer,
                isCorrect: a.isCorrect,
                timeSpent: a.timeSpent
              };
            })
          }));
        } catch (error) {
          console.error('Failed to save quiz results:', error);
        }
      };

      saveResults();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // Handle answer submission
  const handleAnswer = useCallback((answer: string) => {
    if (state.status !== 'active') return;

    timer.pause();
    const timeSpent = Date.now() - answerTimeRef.current;
    const isCorrect = submitAnswer(answer, timeSpent);

    if (isCorrect) {
      playSuccess();
    } else {
      playError();
    }

    // Auto-advance if enabled
    if (config.autoAdvance) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        handleNext();
      }, 2000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, submitAnswer, config.autoAdvance, playSuccess, playError]);

  // Handle next question
  const handleNext = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    playClick();
    nextQuestion();
  }, [nextQuestion, playClick]);

  // Handle quiz start
  const handleStart = (newConfig: QuizConfig) => {
    setConfig(newConfig);
    playClick();
    // Pass config directly to avoid stale closure issue
    startQuiz(newConfig);
  };

  // Handle restart
  const handleRestart = () => {
    playClick();
    resetQuiz();
  };

  // Handle back to home
  const handleHome = async () => {
    playClick();
    // Refresh stats from backend if quiz was completed
    if (state.status === 'complete') {
      await loadUserData();
    }
    navigate('/');
  };

  // Cleanup auto-advance timer
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Get selected answer for current question
  const currentAnswer = state.answers.find(
    a => a.questionId === currentQuestion?.id
  );

  // Guard: need at least 4 words for MCQ
  if (vocabulary.length < 4) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-quiz-light/30 to-gray-50">
        <TopBar onBack={() => navigate('/')} title={t('quiz:settings')} />
        <main className="max-w-md mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm p-8 text-center"
          >
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <p className="text-gray-700 font-medium mb-6">{t('wordlists:minWordsQuiz')}</p>
            <Button variant="quiz" onClick={() => navigate('/')}>
              {t('quiz:backToHome', 'Back to Home')}
            </Button>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-quiz-light/30 to-gray-50">
      {/* Top bar - show during setup and quiz */}
      {state.status !== 'complete' && (
        <TopBar
          onBack={handleHome}
          title={state.status === 'setup' ? t('settings') : t('questionCount', { current: state.currentIndex + 1, total: state.totalQuestions })}
          rightContent={
            <div className="flex items-center gap-3">
              {state.status === 'active' && (
                config.timePerQuestion !== null ? (
                  <Timer
                    timeRemaining={timer.timeRemaining}
                    totalTime={config.timePerQuestion}
                    variant="both"
                    onWarning={playWarning}
                  />
                ) : (
                  <span className="text-sm text-gray-500 font-medium">{t('noTimeLimit')}</span>
                )
              )}
              <NotificationBell />
              <UserMenu />
            </div>
          }
        />
      )}

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Setup screen */}
        {state.status === 'setup' && (
          <QuizSetup
            onStart={handleStart}
            maxQuestions={vocabulary.length}
          />
        )}

        {/* Active quiz */}
        {(state.status === 'active' || state.status === 'review') && currentQuestion && (
          <>
            {/* Progress bar */}
            <div className="mb-6">
              <ProgressBar
                current={state.currentIndex + 1}
                total={state.totalQuestions}
                color="bg-quiz"
              />
            </div>

            {/* Question */}
            <AnimatePresence mode="wait">
              <QuestionCard
                key={currentQuestion.id}
                question={currentQuestion}
                onAnswer={handleAnswer}
                showResult={state.status === 'review'}
                selectedAnswer={currentAnswer?.selectedAnswer || null}
                disabled={state.status === 'review'}
              />
            </AnimatePresence>

            {/* Next button */}
            {state.status === 'review' && (
              <div className="mt-6">
                <Button
                  variant="quiz"
                  fullWidth
                  onClick={handleNext}
                >
                  {isLastQuestion ? t('seeResults') : t('nextQuestion')}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Results screen */}
        {state.status === 'complete' && (
          <QuizResults
            state={state}
            onRestart={handleRestart}
            onHome={handleHome}
          />
        )}
      </main>
    </div>
  );
}
