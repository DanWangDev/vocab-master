import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const variantStyles = {
  default: 'bg-white shadow-card',
  elevated: 'bg-white shadow-mode-card',
  outlined: 'bg-white border-2 border-gray-200',
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <motion.div
      className={`
        rounded-3xl
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hover ? 'hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
