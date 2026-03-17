import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Star, Zap } from 'lucide-react';

interface StreakMilestoneProps {
  streak: number;
  isVisible: boolean;
  onDismiss: () => void;
}

const milestoneConfig: Record<number, { icon: typeof Flame; color: string; bgColor: string; messageKey: string }> = {
  5: {
    icon: Flame,
    color: 'text-orange-500',
    bgColor: 'from-orange-400 to-orange-600',
    messageKey: 'streak5',
  },
  10: {
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'from-yellow-400 to-amber-500',
    messageKey: 'streak10',
  },
  15: {
    icon: Star,
    color: 'text-purple-500',
    bgColor: 'from-purple-400 to-purple-600',
    messageKey: 'streak15',
  },
  20: {
    icon: Star,
    color: 'text-pink-500',
    bgColor: 'from-pink-400 to-rose-500',
    messageKey: 'streak20',
  },
};

export function StreakMilestone({ streak, isVisible, onDismiss }: StreakMilestoneProps) {
  const { t } = useTranslation('challenge');
  const config = milestoneConfig[streak] || milestoneConfig[5];
  const Icon = config.icon;

  // Auto-dismiss after 1.5 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Background particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  scale: 0,
                  x: '50vw',
                  y: '50vh',
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: `${20 + Math.random() * 60}vw`,
                  y: `${20 + Math.random() * 60}vh`,
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.05,
                  ease: 'easeOut',
                }}
                className={`absolute w-4 h-4 ${config.color}`}
              >
                <Icon className="w-full h-full" />
              </motion.div>
            ))}
          </div>

          {/* Central celebration */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative"
          >
            {/* Glow ring */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className={`absolute inset-0 rounded-full bg-gradient-to-r ${config.bgColor} blur-xl`}
              style={{ width: 160, height: 160, left: -30, top: -30 }}
            />

            {/* Icon container */}
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${config.bgColor} flex items-center justify-center shadow-2xl`}
            >
              <Icon className="w-12 h-12 text-white" />
            </motion.div>

            {/* Streak number */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center"
            >
              <span className={`text-lg font-bold ${config.color}`}>{streak}</span>
            </motion.div>
          </motion.div>

          {/* Message */}
          <motion.p
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 60, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute text-2xl font-bold text-white drop-shadow-lg"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
          >
            {t(config.messageKey as never)}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
