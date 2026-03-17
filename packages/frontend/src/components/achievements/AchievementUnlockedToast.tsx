import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NewlyEarnedAchievement } from '../../services/api/achievementApi';

const ICON_MAP: Record<string, string> = {
  rocket: '🚀', fire: '🔥', trophy: '🏆', sparkles: '✨', zap: '⚡',
  flame: '🔥', book: '📚', sword: '⚔️', medal: '🏅', star: '⭐',
};

interface Props {
  achievement: NewlyEarnedAchievement | null;
  onClose: () => void;
}

export function AchievementUnlockedToast({ achievement, onClose }: Props) {
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm"
        >
          <button
            onClick={onClose}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 shadow-2xl shadow-amber-300/50 border border-amber-300/50 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/30 flex items-center justify-center text-2xl">
                {ICON_MAP[achievement.icon] || '⭐'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-amber-900/70">
                  Achievement Unlocked!
                </p>
                <p className="text-lg font-black text-white drop-shadow-sm truncate">
                  {achievement.name}
                </p>
                <p className="text-xs text-white/80 font-medium truncate">
                  {achievement.description}
                </p>
              </div>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
