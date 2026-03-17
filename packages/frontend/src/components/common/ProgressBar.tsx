import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
  showText?: boolean;
  color?: string;
  height?: 'sm' | 'md' | 'lg';
}

const heightStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  current,
  total,
  showText = true,
  color = 'bg-primary-500',
  height = 'md',
}: ProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${heightStyles[height]}`}>
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {showText && (
        <span className="text-sm font-medium text-gray-600 min-w-[4rem] text-right">
          {current} / {total}
        </span>
      )}
    </div>
  );
}
