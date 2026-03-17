import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Play, Clock, Hash } from 'lucide-react';
import { Button, Card } from '../common';
import type { QuizConfig } from '../../types';

interface QuizSetupProps {
  onStart: (config: QuizConfig) => void;
  maxQuestions: number;
}

export function QuizSetup({ onStart, maxQuestions }: QuizSetupProps) {
  const { t } = useTranslation('quiz');
  const [questionCount, setQuestionCount] = useState(10);
  const [hasTimeLimit, setHasTimeLimit] = useState(true);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [autoAdvance, setAutoAdvance] = useState(false);

  const handleStart = () => {
    onStart({
      totalQuestions: questionCount,
      timePerQuestion: hasTimeLimit ? timePerQuestion : null,
      autoAdvance,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto"
    >
      <Card variant="elevated" padding="lg">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
          {t('settings')}
        </h2>

        {/* Number of questions */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Hash className="w-4 h-4" />
            {t('numQuestions')} <span className="font-bold text-quiz">{questionCount}</span>
          </label>
          <input
            type="range"
            min={5}
            max={Math.min(50, maxQuestions)}
            value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-quiz"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5</span>
            <span>{Math.min(50, maxQuestions)}</span>
          </div>
        </div>

        {/* Time limit toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasTimeLimit}
              onChange={(e) => setHasTimeLimit(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-quiz focus:ring-quiz"
            />
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Clock className="w-4 h-4" />
              {t('enableTimeLimit')}
            </span>
          </label>
        </div>

        {/* Time per question - only show when time limit is enabled */}
        {hasTimeLimit && (
          <div className="mb-6 ml-8">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              {t('secondsPerQuestion')} <span className="font-bold text-quiz">{timePerQuestion}s</span>
            </label>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-quiz"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>10s</span>
              <span>60s</span>
            </div>
          </div>
        )}

        {/* Auto-advance option */}
        <div className="mb-8">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-quiz focus:ring-quiz"
            />
            <span className="text-sm text-gray-700">
              {t('autoAdvance')}
            </span>
          </label>
        </div>

        {/* Start button */}
        <Button
          variant="quiz"
          size="xl"
          fullWidth
          onClick={handleStart}
        >
          <Play className="w-5 h-5" />
          {t('startQuiz')}
        </Button>
      </Card>
    </motion.div>
  );
}
