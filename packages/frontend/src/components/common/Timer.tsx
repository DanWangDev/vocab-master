import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  variant?: 'bar' | 'text' | 'both';
  showWarning?: boolean;
  warningThreshold?: number;
  onWarning?: () => void;
}

export function Timer({
  timeRemaining,
  totalTime,
  variant = 'both',
  showWarning = true,
  warningThreshold = 5,
  onWarning,
}: TimerProps) {
  const warningTriggered = useRef(false);
  const percentage = (timeRemaining / totalTime) * 100;

  // Determine color based on time remaining
  const getColor = () => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (percentage > 50) return 'text-green-600';
    if (percentage > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Trigger warning
  useEffect(() => {
    if (
      showWarning &&
      timeRemaining <= warningThreshold &&
      timeRemaining > 0 &&
      !warningTriggered.current
    ) {
      warningTriggered.current = true;
      onWarning?.();
    }

    // Reset warning trigger when timer resets
    if (timeRemaining > warningThreshold) {
      warningTriggered.current = false;
    }
  }, [timeRemaining, warningThreshold, showWarning, onWarning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Progress bar - hidden on mobile to save space */}
      {(variant === 'bar' || variant === 'both') && (
        <div className="hidden sm:block w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${getColor()} rounded-full`}
            initial={{ width: '100%' }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3, ease: 'linear' }}
          />
        </div>
      )}

      {(variant === 'text' || variant === 'both') && (
        <motion.span
          className={`font-bold text-base sm:text-lg min-w-[2.5rem] text-center ${getTextColor()}`}
          animate={timeRemaining <= warningThreshold ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5, repeat: timeRemaining <= warningThreshold ? Infinity : 0 }}
        >
          {formatTime(timeRemaining)}
        </motion.span>
      )}
    </div>
  );
}
