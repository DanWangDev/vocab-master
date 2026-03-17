import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Home, Loader2, Inbox } from 'lucide-react';
import { SentenceBuildCard } from './SentenceBuildCard';
import { exerciseApi, type SentenceBuildExercise } from '../../services/api/exerciseApi';

export function SentenceBuildSession() {
  const { t } = useTranslation('exercises');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wordlistId = parseInt(searchParams.get('wordlistId') || '0', 10);

  const [exercises, setExercises] = useState<SentenceBuildExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = useCallback(async () => {
    if (!wordlistId) {
      setError('No wordlist selected');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await exerciseApi.getSentenceBuild(wordlistId, 10);
      setExercises(data.exercises);
      setCurrentIndex(0);
      setCorrectCount(0);
    } catch {
      setError('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  }, [wordlistId]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleResult = (correct: boolean) => {
    if (correct) setCorrectCount(prev => prev + 1);
    setCurrentIndex(prev => prev + 1);
  };

  const isComplete = currentIndex >= exercises.length && exercises.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || exercises.length === 0) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-sm w-full"
        >
          <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('noExercises')}</h2>
          <p className="text-gray-500 mb-6">{t('noExercisesMessage')}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors"
          >
            {t('backToDashboard')}
          </button>
        </motion.div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-sm w-full"
        >
          <div className="text-5xl mb-4">🏗️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('sessionComplete')}</h2>
          <p className="text-lg text-gray-600 mb-6">
            {t('score', { correct: correctCount, total: exercises.length })}
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={fetchExercises}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('tryAgain')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              <Home className="w-4 h-4" />
              {t('backToDashboard')}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">{t('sentenceBuild')}</h1>
          <span className="ml-auto text-sm text-gray-500">
            {currentIndex + 1} / {exercises.length}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-lg mx-auto w-full px-4 pt-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300 rounded-full"
            style={{ width: `${(currentIndex / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <SentenceBuildCard
              key={currentIndex}
              exercise={exercises[currentIndex]}
              onResult={handleResult}
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
