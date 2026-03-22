import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { PronunciationButton } from '../common/PronunciationButton';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';

interface SpellingExercise {
  word: string;
  definition: string;
  sentence?: string;
  blankedSentence?: string;
  hint?: string;
}

interface SpellingCardProps {
  exercise: SpellingExercise;
  mode: 'definition' | 'fill_blank';
  onResult: (correct: boolean, timeSpent: number) => void;
}

export function SpellingCard({ exercise, mode, onResult }: SpellingCardProps) {
  const { t } = useTranslation('exercises');
  const [userInput, setUserInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [retryMode, setRetryMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef(0);
  const { speak } = useSpeechSynthesis();

  useEffect(() => {
    startTimeRef.current = Date.now();
    inputRef.current?.focus();
    // Auto-play pronunciation in definition mode
    if (mode === 'definition') {
      speak(exercise.word);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (retryMode) {
      inputRef.current?.focus();
    }
  }, [retryMode]);

  const normalizeAnswer = (str: string) => str.trim().toLowerCase();

  const handleSubmit = () => {
    if (!userInput.trim()) return;

    if (retryMode) {
      // In retry mode, check if they typed the correct word
      if (normalizeAnswer(userInput) === normalizeAnswer(exercise.word)) {
        const timeSpent = Date.now() - startTimeRef.current;
        onResult(false, timeSpent); // Still counts as incorrect for scoring
      }
      return;
    }

    const correct = normalizeAnswer(userInput) === normalizeAnswer(exercise.word);
    setIsCorrect(correct);
    setChecked(true);

    if (correct) {
      const timeSpent = Date.now() - startTimeRef.current;
      // Small delay before advancing
      setTimeout(() => onResult(true, timeSpent), 1200);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleRetry = () => {
    setUserInput('');
    setRetryMode(true);
    setChecked(false);
    setIsCorrect(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-3xl shadow-lg p-6 sm:p-8"
    >
      {/* Prompt */}
      <div className="mb-6">
        {mode === 'definition' ? (
          <>
            <p className="text-sm text-gray-500 mb-2">{t('spellTheWord')}</p>
            <p className="text-lg text-gray-800 font-medium leading-relaxed">{exercise.definition}</p>
            <div className="mt-3 flex items-center gap-2">
              <PronunciationButton word={exercise.word} size="md" />
              <span className="text-sm text-gray-500">{t('hearTheWord')}</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-2">{t('fillInBlank')}</p>
            <p className="text-lg text-gray-800 font-medium leading-relaxed">
              {exercise.blankedSentence}
            </p>
            {exercise.hint && (
              <p className="mt-3 text-base text-emerald-700 font-mono tracking-widest">
                {t('hintLabel')}: {exercise.hint}
              </p>
            )}
            {exercise.definition && (
              <p className="mt-2 text-sm text-gray-500 italic">
                {t('definitionHint')}: {exercise.definition}
              </p>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="mb-4">
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={checked && isCorrect}
          placeholder={retryMode ? t('typeCorrectWord') : t('typeYourAnswer')}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className={`w-full px-4 py-3 text-lg rounded-xl border-2 outline-none transition-colors ${
            checked
              ? isCorrect
                ? 'border-green-400 bg-green-50 text-green-800'
                : 'border-red-400 bg-red-50 text-red-800'
              : retryMode
                ? 'border-amber-300 bg-amber-50 focus:border-amber-400'
                : 'border-gray-200 focus:border-emerald-400'
          }`}
        />
      </div>

      {/* Feedback */}
      {checked && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`mb-4 p-4 rounded-xl ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            {isCorrect ? (
              <><Check className="w-5 h-5 text-green-600" /><span className="font-bold text-green-700">{t('correct')}</span></>
            ) : (
              <><X className="w-5 h-5 text-red-600" /><span className="font-bold text-red-700">{t('incorrect')}</span></>
            )}
          </div>
          {!isCorrect && (
            <p className="text-sm text-gray-600 mt-1">
              {t('correctAnswer')}: <span className="font-bold text-gray-800">{exercise.word}</span>
            </p>
          )}
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!checked ? (
          <button
            onClick={handleSubmit}
            disabled={!userInput.trim()}
            className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {retryMode ? t('checkRetry') : t('checkAnswer')}
          </button>
        ) : !isCorrect && !retryMode ? (
          <button
            onClick={handleRetry}
            className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors cursor-pointer"
          >
            {t('trySpellingAgain')}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
