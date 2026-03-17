import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

type OptionState = 'default' | 'selected' | 'correct' | 'incorrect';

interface OptionButtonProps {
  label: string;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
  index: number;
}

const stateStyles: Record<OptionState, string> = {
  default: 'bg-white border-primary-100 shadow-clay-sm hover:shadow-clay hover:border-primary-300 hover:bg-primary-50/50',
  selected: 'bg-primary-100 border-primary-400 shadow-clay-pressed',
  correct: 'bg-study-light border-study shadow-[4px_4px_0_0_rgba(22,163,74,0.3)]',
  incorrect: 'bg-red-50 border-red-400 shadow-[4px_4px_0_0_rgba(239,68,68,0.3)]',
};

const optionLabels = ['A', 'B', 'C', 'D'];

export function OptionButton({
  label,
  state,
  disabled,
  onClick,
  index,
}: OptionButtonProps) {
  const isAnswered = state === 'correct' || state === 'incorrect';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.01, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.99, y: 1 }}
      animate={state === 'incorrect' ? { x: [0, -8, 8, -8, 8, 0] } : {}}
      transition={state === 'incorrect' ? { duration: 0.4 } : { type: 'spring', stiffness: 400, damping: 17 }}
      className={`
        w-full p-4 rounded-clay-sm border-2 text-left cursor-pointer
        transition-all duration-200 ease-out
        disabled:cursor-not-allowed
        ${stateStyles[state]}
        ${disabled && state === 'default' ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Option letter - chunky badge style */}
        <span
          className={`
            w-9 h-9 rounded-xl flex items-center justify-center
            font-extrabold text-sm border-2 transition-all duration-200
            ${state === 'correct' ? 'bg-study text-white border-study-dark shadow-sm' : ''}
            ${state === 'incorrect' ? 'bg-red-500 text-white border-red-600 shadow-sm' : ''}
            ${state === 'default' ? 'bg-primary-50 text-primary-600 border-primary-200' : ''}
            ${state === 'selected' ? 'bg-primary-500 text-white border-primary-600' : ''}
          `}
        >
          {isAnswered ? (
            state === 'correct' ? (
              <Check className="w-5 h-5" strokeWidth={3} />
            ) : (
              <X className="w-5 h-5" strokeWidth={3} />
            )
          ) : (
            optionLabels[index]
          )}
        </span>

        {/* Option text */}
        <span
          className={`
            flex-1 font-semibold
            ${state === 'correct' ? 'text-study-dark' : ''}
            ${state === 'incorrect' ? 'text-red-700' : ''}
            ${state === 'default' ? 'text-primary-800' : ''}
            ${state === 'selected' ? 'text-primary-900' : ''}
          `}
        >
          {label}
        </span>
      </div>
    </motion.button>
  );
}
