import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface ModeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: 'study' | 'quiz' | 'challenge' | 'achievement' | 'leaderboard' | 'groups' | 'reports';
  onClick: () => void;
  badge?: string;
}

const colorStyles = {
  study: {
    bg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
    iconBg: 'bg-white/20',
    border: 'border-white/20',
    shadow: 'shadow-[rgba(16,185,129,0.3)_0px_8px_24px]',
    hoverShadow: 'hover:shadow-[rgba(16,185,129,0.4)_0px_12px_28px]',
  },
  quiz: {
    bg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    iconBg: 'bg-white/20',
    border: 'border-white/20',
    shadow: 'shadow-[rgba(245,158,11,0.3)_0px_8px_24px]',
    hoverShadow: 'hover:shadow-[rgba(245,158,11,0.4)_0px_12px_28px]',
  },
  challenge: {
    bg: 'bg-gradient-to-br from-rose-500 to-red-600',
    iconBg: 'bg-white/20',
    border: 'border-white/20',
    shadow: 'shadow-[rgba(244,63,94,0.3)_0px_8px_24px]',
    hoverShadow: 'hover:shadow-[rgba(244,63,94,0.4)_0px_12px_28px]',
  },
  achievement: {
    bg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    iconBg: 'bg-white/20',
    border: 'border-white/20',
    shadow: 'shadow-[rgba(139,92,246,0.3)_0px_8px_24px]',
    hoverShadow: 'hover:shadow-[rgba(139,92,246,0.4)_0px_12px_28px]',
  },
  leaderboard: {
    bg: 'bg-gradient-to-br from-sky-500 to-blue-600',
    iconBg: 'bg-white/20',
    border: 'border-white/20',
    shadow: 'shadow-[rgba(14,165,233,0.3)_0px_8px_24px]',
    hoverShadow: 'hover:shadow-[rgba(14,165,233,0.4)_0px_12px_28px]',
  },
  groups: {
    bg: 'bg-gradient-to-br from-cyan-500 to-teal-600',
    iconBg: 'bg-white/20',
    border: 'border-white/20',
    shadow: 'shadow-[rgba(6,182,212,0.3)_0px_8px_24px]',
    hoverShadow: 'hover:shadow-[rgba(6,182,212,0.4)_0px_12px_28px]',
  },
  reports: {
    bg: 'bg-gradient-to-br from-indigo-500 to-blue-600',
    iconBg: 'bg-white/20',
    border: 'border-white/20',
    shadow: 'shadow-[rgba(99,102,241,0.3)_0px_8px_24px]',
    hoverShadow: 'hover:shadow-[rgba(99,102,241,0.4)_0px_12px_28px]',
  },
};

export function ModeCard({
  title,
  description,
  icon: Icon,
  color,
  onClick,
  badge,
}: ModeCardProps) {
  const styles = colorStyles[color];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      className={`
        w-full p-6 rounded-3xl text-left text-white cursor-pointer
        border ${styles.border}
        ${styles.bg} ${styles.shadow} ${styles.hoverShadow}
        transition-all duration-300
        focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-white
      `}
    >
      <div className="flex items-center gap-5">
        {/* Icon - chunky 3D style */}
        <div className={`
          p-4 rounded-2xl ${styles.iconBg}
          backdrop-blur-sm
          shadow-inner
        `}>
          <Icon className="w-8 h-8 drop-shadow-md text-white" strokeWidth={2.5} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black tracking-tight drop-shadow-sm">{title}</h3>
            {badge && (
              <span className={`
                px-3 py-1 text-xs font-black uppercase tracking-wider
                bg-white text-gray-800
                rounded-full
                shadow-sm
              `}>
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/90 font-bold opacity-90">{description}</p>
        </div>

        {/* Arrow indicator */}
        <div className="text-white/70">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </motion.button>
  );
}
