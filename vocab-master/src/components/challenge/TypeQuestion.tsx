import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Send, Check, X } from 'lucide-react';
import { Button } from '../common';
import type { QuizQuestion } from '../../types';
import { isAnswerCorrect } from '../../utils';

interface TypeQuestionProps {
  question: QuizQuestion;
  onAnswer: (answer: string) => void;
  showResult: boolean;
  userAnswer: string | null;
  disabled: boolean;
}

export function TypeQuestion({
  question,
  onAnswer,
  showResult,
  userAnswer,
  disabled,
}: TypeQuestionProps) {
  const { t } = useTranslation('challenge');
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when question changes
  useEffect(() => {
    setInputValue(''); // eslint-disable-line react-hooks/set-state-in-effect
    if (!showResult && inputRef.current) {
      inputRef.current.focus();
    }
  }, [question.id, showResult]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled && !showResult) {
      onAnswer(inputValue.trim());
    }
  };

  const isCorrect = userAnswer
    ? isAnswerCorrect(userAnswer, question.correctAnswer)
    : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full"
    >
      {/* Prompt */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {question.promptType === 'synonym' ? t('synonym') : t('definition')}
        </p>
        <p className="text-lg sm:text-xl text-gray-800 font-medium">
          {question.prompt}
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={showResult ? (userAnswer || '') : inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={disabled || showResult}
            placeholder={t('typeTheWord')}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            className={`
              w-full px-4 py-4 text-lg rounded-xl border-2
              focus:outline-none focus:ring-2 focus:ring-offset-2
              transition-colors
              ${showResult && isCorrect
                ? 'border-green-500 bg-green-50 text-green-700 focus:ring-green-500'
                : showResult && !isCorrect
                ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
                : 'border-gray-200 focus:border-primary-500 focus:ring-primary-500'
              }
              disabled:bg-gray-50 disabled:cursor-not-allowed
            `}
          />

          {/* Result indicator */}
          {showResult && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`
                absolute right-3 top-1/2 -translate-y-1/2
                w-8 h-8 rounded-full flex items-center justify-center
                ${isCorrect ? 'bg-green-500' : 'bg-red-500'}
              `}
            >
              {isCorrect ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <X className="w-5 h-5 text-white" />
              )}
            </motion.div>
          )}
        </div>

        {/* Show correct answer if wrong */}
        {showResult && !isCorrect && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-50 rounded-xl border border-green-200"
          >
            <p className="text-sm text-green-600 font-medium">
              {t('correctAnswer')}
            </p>
            <p className="text-lg text-green-700 font-bold">
              {question.correctAnswer}
            </p>
          </motion.div>
        )}

        {/* Submit button */}
        {!showResult && (
          <Button
            type="submit"
            variant="challenge"
            fullWidth
            disabled={!inputValue.trim() || disabled}
          >
            <Send className="w-5 h-5" />
            {t('submitAnswerSimple')}
          </Button>
        )}
      </form>
    </motion.div>
  );
}
