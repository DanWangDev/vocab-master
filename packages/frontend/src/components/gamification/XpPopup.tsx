import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useXp } from '../../hooks/useXp';

export function XpPopup() {
  const { t } = useTranslation('gamification');
  const { xpPopups } = useXp();

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {xpPopups.map((popup) => (
          <motion.div
            key={popup.id}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-lg font-black text-amber-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
          >
            {t('xpEarned', { amount: popup.amount })}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
