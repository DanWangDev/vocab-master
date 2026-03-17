import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';

interface TopBarProps {
  onBack: () => void;
  title?: ReactNode;
  rightContent?: ReactNode;
  variant?: 'back' | 'close';
}

export function TopBar({
  onBack,
  title,
  rightContent,
  variant = 'back',
}: TopBarProps) {
  const { t } = useTranslation('common');
  const Icon = variant === 'close' ? X : ArrowLeft;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b-2 border-primary-100"
    >
      <div className="flex items-center h-14 px-4 gap-2">
        {/* Left: Back/Close button */}
        <button
          onClick={onBack}
          className="p-2 -ml-1 rounded-xl bg-primary-50 border-2 border-primary-100 hover:bg-primary-100 hover:border-primary-200 transition-all duration-200 flex-shrink-0 cursor-pointer shadow-sm"
          aria-label={variant === 'close' ? t('close') : t('goBack')}
        >
          <Icon className="w-5 h-5 text-primary-700" />
        </button>

        {/* Center: Title - uses flex-1 to take available space */}
        {title && (
          <h1 className="flex-1 text-base sm:text-lg font-bold text-primary-900 text-center truncate px-1">
            {title}
          </h1>
        )}

        {/* Right: Optional content (timer, settings, etc.) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightContent}
        </div>
      </div>
    </motion.header>
  );
}
