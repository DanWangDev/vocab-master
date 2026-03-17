import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { UserMenu } from '../common/UserMenu';
import { NotificationBell } from '../notifications/NotificationBell';
import { useAudio } from '../../hooks/useAudio';
import ApiService from '../../services/ApiService';

interface WeakWord {
  word: string;
  incorrectCount: number;
  correctCount: number;
  totalAttempts: number;
  accuracy: number;
}

export function StudyLanding() {
  const { t } = useTranslation('study');
  const navigate = useNavigate();
  const { playClick } = useAudio();
  const [weakWords, setWeakWords] = useState<WeakWord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeakWords = async () => {
      try {
        const data = await ApiService.getWeakWords();
        setWeakWords(data.weakWords);
      } catch (err) {
        console.error('Failed to fetch weak words:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWeakWords();
  }, []);

  const handleBack = () => {
    playClick();
    navigate('/');
  };

  const handleStudyAll = () => {
    playClick();
    navigate('/study/all');
  };

  const handlePracticeMistakes = () => {
    playClick();
    navigate('/study/mistakes');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-study-light/30 to-gray-50">
      <TopBar
        onBack={handleBack}
        title={t('title')}
        rightContent={<><NotificationBell /><UserMenu /></>}
      />

      <main className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Study All Words Card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStudyAll}
            className="w-full bg-white rounded-2xl shadow-mode-card p-6 text-left cursor-pointer border-2 border-transparent hover:border-study transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-study to-study-dark">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {t('studyAllWords')}
                </h3>
                <p className="text-gray-500 text-sm">
                  {t('studyAllWordsDesc')}
                </p>
              </div>
            </div>
          </motion.button>

          {/* Practice Mistakes Card */}
          <motion.button
            whileHover={{ scale: weakWords.length > 0 ? 1.02 : 1 }}
            whileTap={{ scale: weakWords.length > 0 ? 0.98 : 1 }}
            onClick={weakWords.length > 0 ? handlePracticeMistakes : undefined}
            disabled={weakWords.length === 0}
            className={`w-full bg-white rounded-2xl shadow-mode-card p-6 text-left border-2 border-transparent transition-all ${
              weakWords.length > 0
                ? 'cursor-pointer hover:border-orange-400'
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-4 rounded-2xl ${
                weakWords.length > 0
                  ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                  : 'bg-gray-300'
              }`}>
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    {t('practiceMistakes')}
                  </h3>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  ) : weakWords.length > 0 ? (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">
                      {weakWords.length} words
                    </span>
                  ) : null}
                </div>
                <p className="text-gray-500 text-sm">
                  {loading
                    ? t('practiceMistakesLoading')
                    : weakWords.length > 0
                    ? t('practiceMistakesDesc')
                    : t('practiceMistakesEmpty')}
                </p>
              </div>
            </div>

            {/* Preview of weak words */}
            {weakWords.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2 font-medium">{t('wordsToPractice')}</p>
                <div className="flex flex-wrap gap-2">
                  {weakWords.slice(0, 5).map((w) => (
                    <span
                      key={w.word}
                      className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full font-medium"
                    >
                      {w.word}
                    </span>
                  ))}
                  {weakWords.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                      {t('moreWords', { count: weakWords.length - 5 })}
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
}
