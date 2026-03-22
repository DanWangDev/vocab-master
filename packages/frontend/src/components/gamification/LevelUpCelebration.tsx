import { useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useXp } from '../../hooks/useXp';

// Pre-computed random positions for confetti dots (stable across renders)
const CONFETTI_SEEDS = Array.from({ length: 20 }, (_, i) => ({
  left: 10 + ((i * 37 + 13) % 80),
  top: 10 + ((i * 53 + 7) % 80),
  yOffset: -50 - ((i * 41 + 19) % 100),
  delay: ((i * 29 + 3) % 50) / 100,
}));

export function LevelUpCelebration() {
  const { t } = useTranslation('gamification');
  const { levelUpEvent, dismissLevelUp } = useXp();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') dismissLevelUp();
  }, [dismissLevelUp]);

  useEffect(() => {
    if (levelUpEvent) {
      document.addEventListener('keydown', handleKeyDown);
      const timer = setTimeout(dismissLevelUp, 5000);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        clearTimeout(timer);
      };
    }
  }, [levelUpEvent, handleKeyDown, dismissLevelUp]);

  const confettiDots = useMemo(() => CONFETTI_SEEDS, []);

  return (
    <AnimatePresence>
      {levelUpEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-primary-900/80 backdrop-blur-sm"
          onClick={dismissLevelUp}
          role="dialog"
          aria-modal="true"
          aria-label={t('levelUp')}
        >
          <div className="text-center">
            {/* Confetti dots */}
            {confettiDots.map((seed, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#14B8A6', '#FBBF24', '#FB7185'][i % 3],
                  left: `${seed.left}%`,
                  top: `${seed.top}%`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  y: [0, seed.yOffset],
                }}
                transition={{ duration: 1.5, delay: seed.delay }}
              />
            ))}

            {/* Level number */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-7xl font-black text-white mb-4"
            >
              {levelUpEvent.level}
            </motion.div>

            {/* Title */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-white/90"
            >
              {t('levelUpTitle', { level: levelUpEvent.level, title: levelUpEvent.title })}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-sm text-white/60 mt-4"
            >
              {t('levelUp')}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
