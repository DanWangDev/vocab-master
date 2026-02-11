import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { useAuth } from '../../src/contexts';
import { TextInput, Button, ErrorMessage } from '../../src/components/common';
import { colors } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const { forgotPassword, state, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!email.trim()) {
      setValidationError(t('validation.emailRequired'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError(t('validation.emailInvalid'));
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      // Error handled by context
    }
  };

  const displayedError = validationError || state.error;

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8">
          <View className="items-center">
            <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
              <CheckCircle size={32} color="#16a34a" />
            </View>

            <Text className="text-xl font-nunito-bold text-gray-800 mb-2">
              {t('checkYourEmail')}
            </Text>
            <Text className="text-gray-600 font-nunito text-center mb-6">
              {t('resetEmailSentPlain', { email })}
            </Text>

            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 w-full">
              <Text className="text-sm text-blue-700 font-nunito text-center">
                {t('checkSpam')}
              </Text>
            </View>

            <Pressable
              onPress={() => router.back()}
              className="flex-row items-center gap-2"
            >
              <ArrowLeft size={18} color={colors.primary[600]} />
              <Text className="text-primary-600 font-nunito-semibold">
                {t('backToSignIn')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="items-center mb-6">
            <View className="w-12 h-12 bg-indigo-100 rounded-xl items-center justify-center mb-3">
              <Mail size={24} color="#4f46e5" />
            </View>
            <Text className="text-xl font-nunito-bold text-gray-800">
              {t('forgotPasswordTitle')}
            </Text>
            <Text className="text-sm font-nunito text-gray-500 text-center">
              {t('forgotPasswordDesc')}
            </Text>
          </View>

          <TextInput
            label={t('form.emailAddress')}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setValidationError(null);
              clearError();
            }}
            placeholder={t('placeholder.email')}
            keyboardType="email-address"
            autoComplete="email"
            autoFocus
            editable={!state.isLoading}
          />

          <ErrorMessage message={displayedError} />

          <Button
            onPress={handleSubmit}
            disabled={!email.trim()}
            loading={state.isLoading}
            icon={<Mail size={20} color={colors.white} />}
          >
            {state.isLoading ? t('sending') : t('sendResetLink')}
          </Button>

          <Pressable
            onPress={() => router.back()}
            disabled={state.isLoading}
            className="flex-row items-center justify-center gap-2 mt-6"
          >
            <ArrowLeft size={18} color={colors.gray[500]} />
            <Text className="text-gray-500 font-nunito-semibold">
              {t('backToSignIn')}
            </Text>
          </Pressable>

          <View className="items-center mt-6">
            <Text className="text-xs font-nunito text-gray-500 text-center">
              {t('parentOnlyRecovery')}
            </Text>
            <Text className="text-xs font-nunito text-gray-500 text-center">
              {t('studentAskParent')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
