import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, X, RotateCcw } from 'lucide-react';
import { PronunciationButton } from '../common/PronunciationButton';
import type { SentenceBuildExercise } from '../../services/api/exerciseApi';

interface SentenceBuildCardProps {
  exercise: SentenceBuildExercise;
  onResult: (correct: boolean) => void;
}

export function SentenceBuildCard({ exercise, onResult }: SentenceBuildCardProps) {
  const { t } = useTranslation('exercises');
  const [availableTokens, setAvailableTokens] = useState<string[]>(exercise.tokens);
  const [placedTokens, setPlacedTokens] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handlePlaceToken = (token: string, index: number) => {
    if (checked) return;
    setPlacedTokens(prev => [...prev, token]);
    setAvailableTokens(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleRemoveToken = (index: number) => {
    if (checked) return;
    const token = placedTokens[index];
    setPlacedTokens(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setAvailableTokens(prev => [...prev, token]);
  };

  const handleCheck = () => {
    const userSentence = placedTokens.join(' ');
    const correct = userSentence === exercise.sentence;
    setIsCorrect(correct);
    setChecked(true);
  };

  const handleReset = () => {
    setAvailableTokens(exercise.tokens);
    setPlacedTokens([]);
    setChecked(false);
    setIsCorrect(false);
  };

  const handleNext = () => {
    onResult(isCorrect);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-3xl shadow-lg p-6 sm:p-8"
    >
      {/* Target word */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-gray-500">{t('buildSentenceFor')}</span>
        <span className="text-lg font-bold text-purple-600">{exercise.word}</span>
        <PronunciationButton word={exercise.word} size="sm" />
      </div>

      {/* Sentence drop zone */}
      <div className="min-h-[60px] bg-gray-50 rounded-2xl p-4 mb-4 border-2 border-dashed border-gray-200">
        {placedTokens.length === 0 ? (
          <p className="text-gray-400 text-sm text-center">{t('dragHint')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {placedTokens.map((token, index) => (
              <motion.button
                key={`placed-${index}`}
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => handleRemoveToken(index)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${checked
                    ? isCorrect
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                    : 'bg-purple-100 text-purple-800 hover:bg-purple-200 cursor-pointer'}
                `}
                disabled={checked}
              >
                {token}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Available tokens */}
      <div className="flex flex-wrap gap-2 mb-6 min-h-[44px]">
        <AnimatePresence mode="popLayout">
          {availableTokens.map((token, index) => (
            <motion.button
              key={`avail-${token}-${index}`}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => handlePlaceToken(token, index)}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer"
              disabled={checked}
            >
              {token}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Feedback */}
      {checked && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`mb-4 p-4 rounded-xl ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? (
              <><Check className="w-5 h-5 text-green-600" /><span className="font-bold text-green-700">{t('correct')}</span></>
            ) : (
              <><X className="w-5 h-5 text-red-600" /><span className="font-bold text-red-700">{t('incorrect')}</span></>
            )}
          </div>
          {!isCorrect && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">{t('correctSentence')}</p>
              <p className="text-sm text-gray-700 font-medium">{exercise.sentence}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!checked ? (
          <>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              disabled={placedTokens.length === 0}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCheck}
              className="flex-1 px-4 py-2.5 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50"
              disabled={availableTokens.length > 0}
            >
              {t('checkAnswer')}
            </button>
          </>
        ) : (
          <button
            onClick={handleNext}
            className="flex-1 px-4 py-2.5 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors"
          >
            {t('next')}
          </button>
        )}
      </div>
    </motion.div>
  );
}
