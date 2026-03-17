import { motion } from 'framer-motion';

const ICON_MAP: Record<string, string> = {
  rocket: '🚀',
  fire: '🔥',
  trophy: '🏆',
  sparkles: '✨',
  zap: '⚡',
  flame: '🔥',
  book: '📚',
  sword: '⚔️',
  medal: '🏅',
  star: '⭐',
};

interface AchievementBadgeProps {
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: { wrapper: 'w-16 h-16', icon: 'text-2xl', text: 'text-xs' },
  md: { wrapper: 'w-20 h-20', icon: 'text-3xl', text: 'text-sm' },
  lg: { wrapper: 'w-24 h-24', icon: 'text-4xl', text: 'text-base' },
};

export function AchievementBadge({
  name,
  icon,
  description,
  earned,
  size = 'md',
}: AchievementBadgeProps) {
  const s = sizeClasses[size];
  const emoji = ICON_MAP[icon] || '⭐';

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex flex-col items-center gap-1.5 text-center"
    >
      <div
        className={`
          ${s.wrapper} rounded-2xl flex items-center justify-center relative
          ${earned
            ? 'bg-gradient-to-br from-amber-100 to-yellow-200 shadow-lg shadow-amber-200/50 border-2 border-amber-300/50'
            : 'bg-gray-100 border-2 border-gray-200 opacity-50'
          }
        `}
      >
        <span className={`${s.icon} ${earned ? '' : 'grayscale'}`}>{emoji}</span>
        {!earned && (
          <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-gray-500/10">
            <span className="text-gray-400 text-xs">🔒</span>
          </div>
        )}
      </div>
      <p className={`${s.text} font-bold ${earned ? 'text-gray-800' : 'text-gray-400'} max-w-[80px] leading-tight`}>
        {name}
      </p>
      <p className={`text-xs ${earned ? 'text-gray-500' : 'text-gray-300'} max-w-[100px] leading-tight`}>
        {description}
      </p>
    </motion.div>
  );
}
