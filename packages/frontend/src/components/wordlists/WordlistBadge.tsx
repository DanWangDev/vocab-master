import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { List, ChevronRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface WordlistBadgeProps {
  onClick: () => void;
}

export function WordlistBadge({ onClick }: WordlistBadgeProps) {
  const { t } = useTranslation('wordlists');
  const { activeWordlist } = useApp();

  const listName = activeWordlist?.name ?? '...';
  const wordCount = activeWordlist?.wordCount ?? 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-3 shadow-sm border border-primary-100 flex items-center gap-3 cursor-pointer transition-colors hover:bg-primary-50/30"
    >
      <div className="bg-primary-100 p-2 rounded-xl">
        <List className="w-5 h-5 text-primary-600" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-xs font-bold text-primary-400 uppercase tracking-wide">
          {t('activeWordlist')}
        </p>
        <p className="text-sm font-bold text-primary-900 truncate">
          {listName}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
          {t('words', { count: wordCount })}
        </span>
        <ChevronRight className="w-4 h-4 text-primary-400" />
      </div>
    </motion.button>
  );
}
