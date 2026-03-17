import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Flame, Trophy } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { Timer, ProgressBar, Button } from '../common';
import { UserMenu } from '../common/UserMenu';
import { NotificationBell } from '../notifications/NotificationBell';
import { MultiSelectQuestion } from './MultiSelectQuestion';
import { ChallengeResults } from './ChallengeResults';
import { StreakMilestone } from './StreakMilestone';
import { useApp } from '../../contexts/AppContext';
import { useTimer } from '../../hooks/useTimer';
import { useAudio } from '../../hooks/useAudio';
import type { DailyChallengeState, AnswerRecord } from '../../types';
import { generateDailyChallengeQuestions } from '../../services/QuizGenerator';
import { StorageService } from '../../services/StorageService';
import { calculatePoints, isMultiSelectCorrect, getTodayString } from '../../utils';

const CHALLENGE_QUESTIONS = 20;
const TIME_PER_QUESTION = 25;
const STREAK_MILESTONES = [5, 10, 15, 20];

export function DailyChallenge() {
  const { t } = useTranslation(['challenge', 'wordlists']);
  const { vocabulary, loadUserData } = useApp();
  const { playSuccess, playError, playClick, playWarning, playComplete } = useAudio();
  const navigate = useNavigate();

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
    todayCompleted: StorageService.hasTodayChallenge(),
  });

  const answerTimeRef = useRef(Date.now());
  const [milestoneStreak, setMilestoneStreak] = useState<number | null>(null);

  // Timer
  const timer = useTimer({
    initialTime: TIME_PER_QUESTION,
    onComplete: () => {
      if (state.status === 'active') {
        handleTimeUp();
      }
    },
    autoStart: false,
  });

  // Current question
  const currentQuestion = state.questions[state.currentIndex] || null;

  // Current answer record
  const currentAnswer = state.answers.find(
    a => a.questionId === currentQuestion?.id
  );

  // Initialize challenge
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

  // Start timer when question becomes active
  useEffect(() => {
    if (state.status === 'active') {
      timer.restart(TIME_PER_QUESTION);
      answerTimeRef.current = Date.now();
    } else {
      timer.pause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.currentIndex]);

  // Handle time up
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

  // Handle answer submission (multi-select)
  const handleAnswer = useCallback((answers: string[]) => {
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
      // Check for streak milestone
      if (STREAK_MILESTONES.includes(newStreak)) {
        setMilestoneStreak(newStreak);
      }
    } else {
      playError();
    }
  }, [state.status, state.streak, currentQuestion, timer, playSuccess, playError]);

  // Handle next question
  const handleNext = useCallback(() => {
    playClick();
    setState(prev => {
      if (prev.currentIndex >= prev.totalQuestions - 1) {
        // Challenge complete
        playComplete();

        // Save completion date
        StorageService.setDailyChallengeDate(getTodayString());

        // Save to backend (stats are updated by backend automatically)
        import('../../services/ApiService').then(({ default: api }) => {
          const totalTimeSpent = prev.answers.reduce((acc, curr) => acc + curr.timeSpent, 0);

          api.saveQuizResult({
            quizType: 'challenge',
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
                timeSpent: a.timeSpent
              };
            })
          }).catch(err => console.error('Failed to save challenge results:', err));
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

  // Handle back to home
  const handleHome = async () => {
    playClick();
    // Refresh stats from backend if challenge was completed
    if (state.status === 'complete') {
      await loadUserData();
    }
    navigate('/');
  };

  // Guard: need at least 4 words for challenge
  if (vocabulary.length < 4) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-challenge-light/30 to-gray-50">
        <TopBar onBack={() => navigate('/')} title={t('challenge:title')} />
        <main className="max-w-md mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm p-8 text-center"
          >
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <p className="text-gray-700 font-medium mb-6">{t('wordlists:minWordsChallenge')}</p>
            <Button variant="challenge" onClick={() => navigate('/')}>
              {t('challenge:backToHome', 'Back to Home')}
            </Button>
          </motion.div>
        </main>
      </div>
    );
  }

  // Intro screen
  if (state.status === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-challenge-light/30 to-gray-50">
        <TopBar onBack={handleHome} title={t('title')} />

        <main className="max-w-md mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-mode-card p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-600 mb-6"
            >
              <Trophy className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('title')}
            </h2>
            <p className="text-gray-500 mb-6">
              {t('description')}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">20</p>
                <p className="text-xs text-gray-500">{t('questions')}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">25s</p>
                <p className="text-xs text-gray-500">{t('perQuestion')}</p>
              </div>
            </div>

            {state.todayCompleted ? (
              <div className="p-4 bg-green-50 rounded-xl border border-green-200 mb-4">
                <p className="text-green-700 font-medium">
                  {t('completedToday')}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {t('comeBackTomorrow')}
                </p>
              </div>
            ) : (
              <Button variant="challenge" size="xl" fullWidth onClick={startChallenge}>
                <Flame className="w-5 h-5" />
                {t('startChallenge')}
              </Button>
            )}

            {state.todayCompleted && (
              <Button variant="ghost" fullWidth onClick={handleHome} className="mt-3">
                {t('backToHome')}
              </Button>
            )}
          </motion.div>
        </main>
      </div>
    );
  }

  // Results screen
  if (state.status === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-challenge-light/30 to-gray-50 py-8">
        <main className="max-w-lg mx-auto px-4">
          <ChallengeResults state={state} onHome={handleHome} />
        </main>
      </div>
    );
  }

  // Active challenge
  return (
    <div className="min-h-screen bg-gradient-to-b from-challenge-light/30 to-gray-50">
      {/* Streak milestone celebration */}
      <StreakMilestone
        streak={milestoneStreak ?? 0}
        isVisible={milestoneStreak !== null}
        onDismiss={() => setMilestoneStreak(null)}
      />

      <TopBar
        onBack={handleHome}
        title={t('questionCount', { current: state.currentIndex + 1, total: state.totalQuestions })}
        rightContent={
          <div className="flex items-center gap-3">
            {/* Streak indicator */}
            {state.streak > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full"
              >
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-orange-600">{state.streak}</span>
              </motion.div>
            )}

            {/* Timer */}
            <Timer
              timeRemaining={timer.timeRemaining}
              totalTime={TIME_PER_QUESTION}
              variant="both"
              onWarning={playWarning}
            />

            <NotificationBell />
            <UserMenu />
          </div>
        }
      />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Progress bar */}
        <div className="mb-6">
          <ProgressBar
            current={state.currentIndex + 1}
            total={state.totalQuestions}
            color="bg-challenge"
          />
        </div>

        {/* Points display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-4"
        >
          <span className="text-sm text-gray-500">{t('points')} </span>
          <span className="font-bold text-challenge">{state.pointsEarned}</span>
        </motion.div>

        {/* Question */}
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <MultiSelectQuestion
              key={currentQuestion.id}
              question={currentQuestion}
              onAnswer={handleAnswer}
              showResult={state.status === 'review'}
              userAnswers={currentAnswer?.selectedAnswers || null}
              disabled={state.status === 'review'}
            />
          )}
        </AnimatePresence>

        {/* Next button */}
        {state.status === 'review' && (
          <div className="mt-6">
            <Button variant="challenge" fullWidth onClick={handleNext}>
              {state.currentIndex >= state.totalQuestions - 1 ? t('seeResults') : t('nextQuestion')}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
