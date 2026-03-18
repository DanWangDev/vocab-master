import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Home, Loader2, Inbox } from 'lucide-react';
import { FlashcardCard } from './FlashcardCard';
import { FlashcardProgress } from './FlashcardProgress';
import { srsApi, type SrsReviewItem } from '../../services/api/srsApi';

export function FlashcardSession() {
  const { t } = useTranslation('flashcard');
  const navigate = useNavigate();

  const [items, setItems] = useState<SrsReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await srsApi.getReviewQueue(20);
      setItems(data.items);
      setCurrentIndex(0);
      setCorrect(0);
      setIncorrect(0);
    } catch {
      setError('Failed to load review queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    const item = items[currentIndex];
    if (!item) return;

    const quality = direction === 'right' ? 4 : 1;
    const isCorrect = direction === 'right';

    if (isCorrect) {
      setCorrect(prev => prev + 1);
    } else {
      setIncorrect(prev => prev + 1);
    }

    // Submit review (fire-and-forget)
    srsApi
      .submitReview(item.id, quality, {
        word: item.word,
        wordlistId: item.wordlistId,
      })
      .catch(() => {
        // Silently fail — the review is still tracked locally
      });

    setCurrentIndex(prev => prev + 1);
  }, [items, currentIndex]);

  const isComplete = currentIndex >= items.length && items.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchQueue} className="px-4 py-2 bg-purple-500 text-white rounded-xl">
            {t('reviewAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-sm w-full"
        >
          <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('noCardsToReview')}</h2>
          <p className="text-gray-500 mb-6">{t('noCardsMessage')}</p>
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
    const total = correct + incorrect;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-sm w-full"
        >
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('sessionComplete')}</h2>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div>
              <p className="text-3xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-500">{t('reviewed')}</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{correct}</p>
              <p className="text-xs text-gray-500">{t('correct')}</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-600">{accuracy}%</p>
              <p className="text-xs text-gray-500">Accuracy</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={fetchQueue}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t('reviewAgain')}
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
          <h1 className="text-lg font-bold text-gray-900">{t('title')}</h1>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-lg mx-auto w-full px-4 pt-4">
        <FlashcardProgress
          total={items.length}
          current={currentIndex}
          correct={correct}
          incorrect={incorrect}
        />
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-lg" style={{ height: 'min(400px, 60vh)' }}>
          <AnimatePresence>
            {items[currentIndex] && (
              <FlashcardCard
                key={items[currentIndex].id}
                item={items[currentIndex]}
                onSwipe={handleSwipe}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Swipe hints */}
      <div className="max-w-lg mx-auto w-full px-4 pb-6">
        <div className="flex justify-between text-sm text-gray-400">
          <span>← {t('swipeLeftHint')}</span>
          <span>{t('swipeRightHint')} →</span>
        </div>
      </div>
    </div>
  );
}
