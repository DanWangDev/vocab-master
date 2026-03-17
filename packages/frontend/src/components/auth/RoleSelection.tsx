import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { GraduationCap, Users, ArrowLeft } from 'lucide-react';

interface RoleSelectionProps {
  onSelectStudent: () => void;
  onSelectParent: () => void;
  onBack: () => void;
}

export function RoleSelection({ onSelectStudent, onSelectParent, onBack }: RoleSelectionProps) {
  const { t } = useTranslation('auth');
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('roleSelection.title')}</h2>
        <p className="text-gray-600">{t('roleSelection.subtitle')}</p>
      </div>

      <div className="space-y-4">
        {/* Student Option */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSelectStudent}
          className="w-full p-6 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border-2 border-indigo-200 hover:border-indigo-300 rounded-2xl transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
              <GraduationCap className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{t('roleSelection.student')}</h3>
              <p className="text-sm text-gray-600">{t('roleSelection.studentDesc')}</p>
            </div>
          </div>
        </motion.button>

        {/* Parent Option */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSelectParent}
          className="w-full p-6 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-2 border-purple-200 hover:border-purple-300 rounded-2xl transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <Users className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{t('roleSelection.parent')}</h3>
              <p className="text-sm text-gray-600">{t('roleSelection.parentDesc')}</p>
            </div>
          </div>
        </motion.button>
      </div>

      <div className="text-center pt-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
        >
          <ArrowLeft size={18} />
          {t('backToSignIn')}
        </button>
      </div>
    </div>
  );
}

export default RoleSelection;
