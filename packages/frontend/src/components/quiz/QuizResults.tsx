import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { Button, Card } from '../common';
import type { QuizState } from '../../types';
import { calculatePercentage, getGrade } from '../../utils';

interface QuizResultsProps {
  state: QuizState;
  onRestart: () => void;
  onHome: () => void;
}

export function QuizResults({ state, onRestart, onHome }: QuizResultsProps) {
  const { t } = useTranslation('quiz');
  const correctCount = state.answers.filter(a => a.isCorrect).length;
  const percentage = calculatePercentage(correctCount, state.totalQuestions);
  const { grade, color } = getGrade(percentage);

  // Get incorrect words for review
  const incorrectWords = state.answers
    .filter(a => !a.isCorrect)
    .map(a => {
      const question = state.questions.find(q => q.id === a.questionId);
      return question?.word.targetWord;
    })
    .filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto"
    >
      <Card variant="elevated" padding="lg">
        {/* Score header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-quiz-light mb-4"
          >
            <Trophy className="w-10 h-10 text-quiz" />
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('quizComplete')}
          </h2>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className={`text-6xl font-bold ${color}`}>{grade}</span>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{correctCount}</p>
            <p className="text-xs text-gray-500">{t('correct')}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">
              {state.totalQuestions - correctCount}
            </p>
            <p className="text-xs text-gray-500">{t('incorrect')}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{percentage}%</p>
            <p className="text-xs text-gray-500">{t('score')}</p>
          </div>
        </div>

        {/* Words to review */}
        {incorrectWords.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {t('wordsToReview')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {incorrectWords.map((word, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button variant="quiz" fullWidth onClick={onRestart}>
            <RotateCcw className="w-5 h-5" />
            {t('tryAgain')}
          </Button>
          <Button variant="ghost" fullWidth onClick={onHome}>
            <Home className="w-5 h-5" />
            {t('backToHome')}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
