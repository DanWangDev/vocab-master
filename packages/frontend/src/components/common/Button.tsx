import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'study' | 'quiz' | 'challenge' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-br from-primary-400 to-primary-600 text-white border-none shadow-[rgba(99,102,241,0.4)_0px_8px_24px] hover:shadow-[rgba(99,102,241,0.5)_0px_12px_28px] focus:ring-primary-400',
  secondary: 'bg-white text-gray-700 border-2 border-gray-100 shadow-[rgba(0,0,0,0.05)_0px_4px_12px] hover:bg-gray-50 focus:ring-gray-300',
  study: 'bg-gradient-to-br from-study to-study-dark text-white border-none shadow-[rgba(34,197,94,0.4)_0px_8px_24px] hover:shadow-[rgba(34,197,94,0.5)_0px_12px_28px] focus:ring-study',
  quiz: 'bg-gradient-to-br from-quiz to-quiz-dark text-white border-none shadow-[rgba(245,158,11,0.4)_0px_8px_24px] hover:shadow-[rgba(245,158,11,0.5)_0px_12px_28px] focus:ring-quiz',
  challenge: 'bg-gradient-to-br from-challenge to-challenge-dark text-white border-none shadow-[rgba(239,68,68,0.4)_0px_8px_24px] hover:shadow-[rgba(239,68,68,0.5)_0px_12px_28px] focus:ring-challenge',
  ghost: 'bg-transparent text-primary-600 hover:bg-primary-50 focus:ring-primary-300',
  outline: 'bg-white border-2 border-primary-400 text-primary-600 hover:bg-primary-50 focus:ring-primary-400',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm font-bold tracking-wide',
  md: 'px-6 py-3 text-base font-extrabold tracking-wide',
  lg: 'px-8 py-4 text-lg font-black tracking-wide',
  xl: 'px-10 py-5 text-xl font-black tracking-wide',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation('common');
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled ? 1 : 1.05, y: disabled ? 0 : -2 }}
        whileTap={{ scale: disabled ? 1 : 0.95, y: disabled ? 0 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className={`
          inline-flex items-center justify-center gap-2
          whitespace-nowrap
          rounded-full cursor-pointer
          transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {t('loading')}
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
