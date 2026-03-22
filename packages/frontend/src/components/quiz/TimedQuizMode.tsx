import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, XCircle, Clock, Zap } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { ProgressBar, Button } from '../common';
import { QuestionCard } from './QuestionCard';
import { QuizResults } from './QuizResults';
import { UserMenu } from '../common/UserMenu';
import { NotificationBell } from '../notifications/NotificationBell';
import { useApp } from '../../contexts/AppContext';
import { useQuiz } from '../../hooks/useQuiz';
import { useTimer } from '../../hooks/useTimer';
import { useAudio } from '../../hooks/useAudio';
import { useAchievements } from '../../hooks/useAchievements';
import type { QuizConfig } from '../../types';

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { timePerQuestion: number; totalTime: number; questionsLabel: string }> = {
  easy: { timePerQuestion: 15, totalTime: 150, questionsLabel: '10' },
  medium: { timePerQuestion: 10, totalTime: 100, questionsLabel: '10' },
  hard: { timePerQuestion: 6, totalTime: 60, questionsLabel: '10' },
};

export function TimedQuizMode() {
  const { t } = useTranslation(['quiz', 'exercises', 'wordlists']);
  const { vocabulary, loadUserData } = useApp();
  const { playSuccess, playError, playClick } = useAudio();
  const { showAchievements } = useAchievements();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'setup' | 'active' | 'complete'>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [saveError, setSaveError] = useState(false);

  const config: QuizConfig = {
    totalQuestions: 10,
    timePerQuestion: DIFFICULTY_CONFIG[difficulty].timePerQuestion,
    autoAdvance: false,
  };

  const {
    state,
    currentQuestion,
    startQuiz,
    submitAnswer,
    nextQuestion,
    resetQuiz,
  } = useQuiz(vocabulary, config);

  const answerTimeRef = useRef(Date.now());

  // Per-question timer
  const questionTimer = useTimer({
    initialTime: DIFFICULTY_CONFIG[difficulty].timePerQuestion,
    onComplete: () => {
      if (state.status === 'active' && currentQuestion) {
        submitAnswer('', DIFFICULTY_CONFIG[difficulty].timePerQuestion * 1000);
        playError();
        // Auto advance after showing result briefly
        setTimeout(() => {
          nextQuestion();
        }, 800);
      }
    },
    autoStart: false,
  });

  // Reset timer on each new question
  useEffect(() => {
    if (state.status === 'active') {
      answerTimeRef.current = Date.now();
      questionTimer.restart(DIFFICULTY_CONFIG[difficulty].timePerQuestion);
    } else {
      questionTimer.pause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.currentIndex, difficulty]);

  // Save results when complete
  useEffect(() => {
    if (state.status === 'complete') {
      setPhase('complete');
      const saveResults = async () => {
        try {
          const totalTimeSpent = state.answers.reduce((acc, curr) => acc + curr.timeSpent, 0);
          const { default: api } = await import('../../services/ApiService');
          const result = await api.saveQuizResult({
            quizType: 'timed',
            totalQuestions: state.totalQuestions,
            correctAnswers: state.score,
            score: state.score,
            timePerQuestion: DIFFICULTY_CONFIG[difficulty].timePerQuestion,
            totalTimeSpent,
            pointsEarned: 0,
            answers: state.answers.map(a => {
              const q = state.questions.find(question => question.id === a.questionId)!;
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
          });
          if (result.newAchievements && result.newAchievements.length > 0) {
            showAchievements(result.newAchievements);
          }
        } catch {
          setSaveError(true);
        }
      };
      saveResults();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const handleAnswer = useCallback((answer: string) => {
    if (state.status !== 'active') return;
    questionTimer.pause();
    const timeSpent = Date.now() - answerTimeRef.current;
    const isCorrect = submitAnswer(answer, timeSpent);

    if (isCorrect) {
      playSuccess();
    } else {
      playError();
    }

    // Auto advance after brief delay
    setTimeout(() => {
      nextQuestion();
    }, 1200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, submitAnswer, playSuccess, playError, nextQuestion]);

  const handleStart = () => {
    playClick();
    setSaveError(false);
    setPhase('active');
    startQuiz(config);
  };

  const handleRestart = () => {
    setSaveError(false);
    playClick();
    setPhase('setup');
    resetQuiz();
  };

  const handleHome = async () => {
    playClick();
    if (state.status === 'complete') {
      await loadUserData();
    }
    navigate('/');
  };

  // Guard: need at least 4 words for MCQ
  if (vocabulary.length < 4) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-gray-50">
        <TopBar onBack={() => navigate('/')} title={t('exercises:timedChallenge', 'Timed Challenge')} />
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

  // Setup screen
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-gray-50">
        <TopBar onBack={() => navigate('/')} title={t('exercises:timedChallenge', 'Timed Challenge')} />
        <main className="max-w-md mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-lg p-6 sm:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {t('exercises:timedChallenge', 'Timed Challenge')}
                </h2>
                <p className="text-sm text-gray-500">
                  {t('exercises:timedDesc', 'Race against the clock to answer questions')}
                </p>
              </div>
            </div>

            {/* Difficulty selection */}
            <div className="mb-8">
              <label className="text-sm font-semibold text-gray-600 mb-3 block">
                {t('exercises:difficulty', 'Difficulty')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => {
                  const isSelected = difficulty === d;
                  const colorMap = {
                    easy: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700' },
                    medium: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
                    hard: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' },
                  };
                  const colors = colorMap[d];

                  return (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-3 px-4 rounded-2xl text-center transition-all cursor-pointer border-2 ${
                        isSelected
                          ? `${colors.border} ${colors.bg}`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`block text-sm font-bold ${
                        isSelected ? colors.text : 'text-gray-600'
                      }`}>
                        {t(`exercises:${d}`, d.charAt(0).toUpperCase() + d.slice(1))}
                      </span>
                      <span className="block text-xs text-gray-400 mt-1">
                        {DIFFICULTY_CONFIG[d].timePerQuestion}s / Q
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              {t('exercises:startTimed', 'Start Challenge')}
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  // Active quiz
  if (phase === 'active' && state.status !== 'complete') {
    const currentAnswer = state.answers.find(a => a.questionId === currentQuestion?.id);
    const timePercent = (questionTimer.timeRemaining / DIFFICULTY_CONFIG[difficulty].timePerQuestion) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-gray-50">
        <TopBar
          onBack={handleHome}
          title={t('quiz:questionCount', {
            current: state.currentIndex + 1,
            total: state.totalQuestions,
          })}
          rightContent={
            <div className="flex items-center gap-3">
              {/* Timer display */}
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${timePercent < 30 ? 'text-red-500' : 'text-amber-500'}`} />
                <span className={`text-sm font-bold ${timePercent < 30 ? 'text-red-500' : 'text-gray-600'}`}>
                  {questionTimer.timeRemaining}s
                </span>
              </div>
              <NotificationBell />
              <UserMenu />
            </div>
          }
        />

        <main className="max-w-lg mx-auto px-4 py-6">
          {/* Timer progress bar */}
          <div className="mb-2">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full transition-colors ${
                  timePercent < 30
                    ? 'bg-red-500'
                    : timePercent < 60
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${timePercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Question progress */}
          <div className="mb-6">
            <ProgressBar
              current={state.currentIndex + 1}
              total={state.totalQuestions}
              color="bg-amber-500"
            />
          </div>

          {/* Question */}
          {currentQuestion && (
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
          )}
        </main>
      </div>
    );
  }

  // Results
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-gray-50">
      <main className="max-w-lg mx-auto px-4 py-6">
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700"
          >
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span>{t('quiz:saveError')}</span>
          </motion.div>
        )}
        <QuizResults
          state={state}
          onRestart={handleRestart}
          onHome={handleHome}
        />
      </main>
    </div>
  );
}
