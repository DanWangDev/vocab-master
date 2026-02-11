import { useState } from 'react';
import { View, TextInput as RNTextInput, Text, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors } from '../../theme';

interface TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'username' | 'password' | 'email' | 'name' | 'off';
  autoFocus?: boolean;
  editable?: boolean;
  hint?: string;
  optional?: boolean;
}

export function TextInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete = 'off',
  autoFocus = false,
  editable = true,
  hint,
  optional = false,
}: TextInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View className="mb-4">
      <Text className="text-sm font-nunito-semibold text-gray-700 mb-1.5">
        {label}
        {optional && (
          <Text className="text-gray-400 font-nunito"> (optional)</Text>
        )}
      </Text>
      <View className="relative">
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[400]}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          editable={editable}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-nunito text-base"
          style={!editable ? { opacity: 0.5 } : undefined}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-0 bottom-0 justify-center"
          >
            {showPassword ? (
              <EyeOff size={20} color={colors.gray[400]} />
            ) : (
              <Eye size={20} color={colors.gray[400]} />
            )}
          </Pressable>
        )}
      </View>
      {hint && (
        <Text className="mt-1 text-xs font-nunito text-gray-500">{hint}</Text>
      )}
    </View>
  );
}
