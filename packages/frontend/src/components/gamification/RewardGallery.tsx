import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Lock, Flame, Check } from 'lucide-react';
import { gamificationApi, type RewardItem } from '../../services/api/gamificationApi';

export function RewardGallery() {
  const { t } = useTranslation('gamification');
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRewards = () => {
    setLoading(true);
    setError(false);
    gamificationApi.getRewards()
      .then(res => {
        setRewards(res.rewards);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchRewards(); }, []);

  const handleToggleActive = async (reward: RewardItem) => {
    if (reward.locked || !reward.earned) return;

    const newSlug = reward.active ? null : reward.reward_slug;
    const rewardType = reward.reward_type as 'avatar_frame' | 'dashboard_theme';

    try {
      await gamificationApi.setActiveReward(newSlug, rewardType);
      fetchRewards();
    } catch { /* silent */ }
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">{t('rewardsError')}</p>
        <button onClick={fetchRewards} className="text-xs text-primary-600 font-bold mt-1">
          {t('retry')}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (rewards.every(r => !r.earned)) {
    return (
      <div className="text-center py-8">
        <Flame className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{t('noRewardsYet')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {rewards.map(reward => (
        <motion.button
          key={reward.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleToggleActive(reward)}
          disabled={!reward.earned || reward.locked}
          className={`relative p-4 rounded-2xl border-2 text-left transition-all
            ${reward.active ? 'border-primary-400 bg-primary-50 shadow-md' : ''}
            ${reward.locked ? 'border-gray-200 bg-gray-50 opacity-60' : ''}
            ${!reward.earned ? 'border-gray-200 bg-gray-50 opacity-40' : ''}
            ${reward.earned && !reward.locked && !reward.active ? 'border-gray-200 bg-white hover:border-primary-300' : ''}
          `}
          aria-label={`${reward.name} — ${reward.locked ? t('rewardLocked', { days: reward.streak_days }) : reward.active ? t('rewardActive') : reward.earned ? t('rewardActivate') : t('rewardUnearned', { days: reward.streak_days })}`}
        >
          {/* Status badge */}
          {reward.active && (
            <span className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-primary-500 text-white text-[10px] font-bold rounded-full">
              <Check size={10} /> {t('rewardActive')}
            </span>
          )}
          {reward.locked && (
            <Lock className="absolute top-2 right-2 w-4 h-4 text-gray-400" />
          )}

          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${reward.locked ? 'bg-gray-200' : 'bg-gradient-to-br from-amber-100 to-amber-200'}`}>
            <span className="text-lg">
              {reward.reward_type === 'avatar_frame' ? '🖼️' : '🎨'}
            </span>
          </div>

          {/* Content */}
          <p className={`text-sm font-bold ${reward.locked ? 'text-gray-400' : 'text-gray-800'}`}>
            {reward.name}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {reward.streak_days}-day streak
          </p>

          {/* Lock message */}
          {reward.locked && (
            <p className="text-[10px] text-amber-600 font-medium mt-1">
              {t('rewardLocked', { days: reward.streak_days })}
            </p>
          )}
          {!reward.earned && (
            <p className="text-[10px] text-gray-400 mt-1">
              {t('rewardUnearned', { days: reward.streak_days })}
            </p>
          )}
        </motion.button>
      ))}
    </div>
  );
}
