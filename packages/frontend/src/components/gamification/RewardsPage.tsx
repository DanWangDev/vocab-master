import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, Gift } from 'lucide-react';
import { RewardGallery } from './RewardGallery';

export function RewardsPage() {
  const { t } = useTranslation('gamification');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F0F9FF] background-pattern">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-primary-100 sticky top-0 z-50"
      >
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-primary-50 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-primary-600" />
          </button>
          <Gift className="w-5 h-5 text-primary-600" />
          <h1 className="text-lg font-black text-primary-900">{t('rewards')}</h1>
        </div>
      </motion.header>

      <main className="max-w-xl mx-auto px-4 py-6">
        <RewardGallery />
      </main>
    </div>
  );
}
