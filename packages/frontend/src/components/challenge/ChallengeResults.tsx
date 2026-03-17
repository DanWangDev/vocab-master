import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Home } from 'lucide-react';
import { Button, Card } from '../common';
import type { DailyChallengeState } from '../../types';
import { calculatePercentage, getGrade } from '../../utils';

interface ChallengeResultsProps {
  state: DailyChallengeState;
  onHome: () => void;
}

export function ChallengeResults({ state, onHome }: ChallengeResultsProps) {
  const { t } = useTranslation('challenge');
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
        {/* Trophy animation */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4 shadow-lg"
          >
            <Trophy className="w-12 h-12 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            {t('challengeComplete')}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
          >
            <span className={`text-6xl font-bold ${color}`}>{grade}</span>
          </motion.div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center p-4 bg-gradient-to-br from-challenge-light to-red-100 rounded-xl"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-5 h-5 text-challenge" />
              <span className="text-3xl font-bold text-challenge">
                {state.pointsEarned}
              </span>
            </div>
            <p className="text-xs text-challenge-dark font-medium">{t('totalPoints')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center p-4 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-5 h-5 text-amber-600" />
              <span className="text-3xl font-bold text-amber-600">
                {correctCount}/{state.totalQuestions}
              </span>
            </div>
            <p className="text-xs text-amber-700 font-medium">Correct</p>
          </motion.div>
        </div>

        {/* Accuracy */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center p-4 bg-gray-50 rounded-xl mb-6"
        >
          <p className="text-4xl font-bold text-gray-900">{percentage}%</p>
          <p className="text-sm text-gray-500">{t('accuracy')}</p>
        </motion.div>

        {/* Words to review */}
        {incorrectWords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-6"
          >
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {t('wordsToReview')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {incorrectWords.map((word, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.05 }}
                  className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium"
                >
                  {word}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Perfect score message */}
        {percentage === 100 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200"
          >
            <p className="text-center text-green-700 font-semibold">
              {t('perfectScore')}
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button variant="challenge" fullWidth onClick={onHome}>
            <Home className="w-5 h-5" />
            {t('backToHome')}
          </Button>
          <p className="text-center text-xs text-gray-400 mt-3">
            {t('comeBackTomorrowShort')}
          </p>
        </motion.div>
      </Card>
    </motion.div>
  );
}
