import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, X, Send } from 'lucide-react';
import { Button } from '../common';
import type { QuizQuestion } from '../../types';
import { isMultiSelectCorrect } from '../../utils';

interface MultiSelectQuestionProps {
  question: QuizQuestion;
  onAnswer: (answers: string[]) => void;
  showResult: boolean;
  userAnswers: string[] | null;
  disabled: boolean;
}

type OptionState = 'default' | 'selected' | 'correct' | 'incorrect' | 'missed';

const optionLabels = ['A', 'B', 'C', 'D'];

export function MultiSelectQuestion({
  question,
  onAnswer,
  showResult,
  userAnswers,
  disabled,
}: MultiSelectQuestionProps) {
  const { t } = useTranslation('challenge');
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());

  // Reset selections when question changes
  useEffect(() => {
    setSelectedOptions(new Set()); // eslint-disable-line react-hooks/set-state-in-effect
  }, [question.id]);

  const correctAnswers = question.correctAnswers || [question.correctAnswer];

  const toggleOption = (option: string) => {
    if (disabled || showResult) return;

    setSelectedOptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(option)) {
        newSet.delete(option);
      } else {
        newSet.add(option);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    if (selectedOptions.size === 0 || disabled || showResult) return;
    onAnswer(Array.from(selectedOptions));
  };

  const getOptionState = (option: string): OptionState => {
    if (!showResult) {
      return selectedOptions.has(option) ? 'selected' : 'default';
    }

    const wasSelected = userAnswers?.includes(option) || false;
    const isCorrectOption = correctAnswers.includes(option);

    if (isCorrectOption && wasSelected) return 'correct';
    if (isCorrectOption && !wasSelected) return 'missed';
    if (!isCorrectOption && wasSelected) return 'incorrect';
    return 'default';
  };

  const isAllCorrect = userAnswers
    ? isMultiSelectCorrect(userAnswers, correctAnswers)
    : false;

  const stateStyles: Record<OptionState, string> = {
    default: 'bg-white border-primary-100 shadow-clay-sm hover:shadow-clay hover:border-primary-300 hover:bg-primary-50/50',
    selected: 'bg-primary-100 border-primary-400 shadow-clay-pressed ring-2 ring-primary-300',
    correct: 'bg-study-light border-study shadow-[4px_4px_0_0_rgba(22,163,74,0.3)]',
    incorrect: 'bg-red-50 border-red-400 shadow-[4px_4px_0_0_rgba(239,68,68,0.3)]',
    missed: 'bg-amber-50 border-amber-400 shadow-[4px_4px_0_0_rgba(245,158,11,0.3)]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full"
    >
      {/* Prompt - Show the word */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {question.promptType === 'synonym' ? t('selectAllSynonyms') : t('selectAllDefinitions')}
        </p>
        <p className="text-2xl sm:text-3xl text-gray-900 font-bold text-center py-2">
          {question.prompt}
        </p>
        <p className="text-xs text-gray-400 text-center mt-2">
          {t('selectMultiple')}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question.options.map((option, index) => {
          const state = getOptionState(option);
          const isAnswered = state === 'correct' || state === 'incorrect' || state === 'missed';

          return (
            <motion.button
              key={option}
              onClick={() => toggleOption(option)}
              disabled={disabled || showResult}
              whileHover={disabled || showResult ? {} : { scale: 1.01, y: -2 }}
              whileTap={disabled || showResult ? {} : { scale: 0.99, y: 1 }}
              animate={state === 'incorrect' ? { x: [0, -8, 8, -8, 8, 0] } : {}}
              transition={state === 'incorrect' ? { duration: 0.4 } : { type: 'spring', stiffness: 400, damping: 17 }}
              className={`
                w-full p-4 rounded-clay-sm border-2 text-left cursor-pointer
                transition-all duration-200 ease-out
                disabled:cursor-not-allowed
                ${stateStyles[state]}
                ${disabled && state === 'default' ? 'opacity-60' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Option badge */}
                <span
                  className={`
                    w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                    font-extrabold text-sm border-2 transition-all duration-200
                    ${state === 'correct' ? 'bg-study text-white border-study-dark shadow-sm' : ''}
                    ${state === 'incorrect' ? 'bg-red-500 text-white border-red-600 shadow-sm' : ''}
                    ${state === 'missed' ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : ''}
                    ${state === 'default' ? 'bg-primary-50 text-primary-600 border-primary-200' : ''}
                    ${state === 'selected' ? 'bg-primary-500 text-white border-primary-600' : ''}
                  `}
                >
                  {isAnswered ? (
                    state === 'correct' ? (
                      <Check className="w-5 h-5" strokeWidth={3} />
                    ) : state === 'missed' ? (
                      <Check className="w-5 h-5" strokeWidth={3} />
                    ) : (
                      <X className="w-5 h-5" strokeWidth={3} />
                    )
                  ) : (
                    optionLabels[index]
                  )}
                </span>

                {/* Option text */}
                <span
                  className={`
                    flex-1 font-semibold leading-snug
                    ${state === 'correct' ? 'text-study-dark' : ''}
                    ${state === 'incorrect' ? 'text-red-700' : ''}
                    ${state === 'missed' ? 'text-amber-700' : ''}
                    ${state === 'default' ? 'text-primary-800' : ''}
                    ${state === 'selected' ? 'text-primary-900' : ''}
                  `}
                >
                  {option}
                </span>

                {/* Selection indicator for non-result state */}
                {!showResult && state === 'selected' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Result summary */}
      {showResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            p-4 rounded-xl border mb-4
            ${isAllCorrect
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
            }
          `}
        >
          <div className="flex items-center gap-2">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center
                ${isAllCorrect ? 'bg-green-500' : 'bg-red-500'}
              `}
            >
              {isAllCorrect ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <X className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <p className={`font-semibold ${isAllCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {isAllCorrect ? t('perfect') : t('notQuiteRight')}
              </p>
              {!isAllCorrect && (
                <p className="text-sm text-gray-600">
                  {t('correctAnswersCount', { correct: correctAnswers.length, selected: userAnswers?.length || 0 })}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Submit button */}
      {!showResult && (
        <Button
          variant="challenge"
          fullWidth
          onClick={handleSubmit}
          disabled={selectedOptions.size === 0 || disabled}
        >
          <Send className="w-5 h-5" />
          {t('submitAnswer', { count: selectedOptions.size })}
        </Button>
      )}
    </motion.div>
  );
}
