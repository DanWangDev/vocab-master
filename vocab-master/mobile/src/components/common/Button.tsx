import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '../../theme';

interface ButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
}

const variantStyles = {
  primary: 'bg-primary-600 active:bg-primary-700',
  secondary: 'bg-gray-600 active:bg-gray-700',
  outline: 'bg-transparent border-2 border-primary-600 active:bg-primary-50',
  ghost: 'bg-transparent active:bg-gray-100',
} as const;

const textStyles = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-primary-600',
  ghost: 'text-gray-600',
} as const;

export function Button({
  onPress,
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  className = '',
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`py-3.5 px-6 rounded-xl flex-row items-center justify-center ${variantStyles[variant]} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'secondary' ? colors.white : colors.primary[600]}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          {typeof children === 'string' ? (
            <Text className={`font-nunito-bold text-base ${textStyles[variant]}`}>
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
      )}
    </Pressable>
  );
}
