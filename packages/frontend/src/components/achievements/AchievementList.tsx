import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AchievementBadge } from './AchievementBadge';
import { achievementApi } from '../../services/api/achievementApi';
import type { Achievement } from '../../services/api/achievementApi';

export function AchievementList() {
  const { t } = useTranslation('achievements');
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    achievementApi.getAll().then(data => {
      setAchievements(data.achievements);
      setTotalEarned(data.totalEarned);
      setTotalAvailable(data.totalAvailable);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const categories = ['quiz', 'streak', 'words', 'challenge', 'special'] as const;
  const grouped = categories
    .map(cat => ({
      category: cat,
      items: achievements.filter(a => a.category === cat),
    }))
    .filter(g => g.items.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-800">{t('title')}</h1>
          <p className="text-sm text-gray-500 font-medium">
            {t('earnedCount', { earned: totalEarned, total: totalAvailable })}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalAvailable > 0 ? (totalEarned / totalAvailable) * 100 : 0}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
          />
        </div>
      </div>

      {/* Categories */}
      {grouped.map(({ category, items }) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            {t(`categories.${category}`)}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {items.map(a => (
              <AchievementBadge
                key={a.slug}
                name={a.name}
                icon={a.icon}
                description={a.description}
                earned={a.earned}
                earnedAt={a.earnedAt}
                size="md"
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
