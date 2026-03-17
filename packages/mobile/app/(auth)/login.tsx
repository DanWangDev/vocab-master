import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LogIn, KeyRound } from 'lucide-react-native';
import { useAuth } from '../../src/contexts';
import { TextInput, Button, ErrorMessage } from '../../src/components/common';
import { GoogleSignInButton } from '../../src/components/auth/GoogleSignInButton';
import { colors } from '../../src/theme';

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const { login, googleLogin, state, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    try {
      await login(username.trim(), password);
    } catch {
      // Error handled by context
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Title */}
          <View className="items-center mb-10">
            <Text className="text-4xl font-nunito-extrabold text-white mb-2">
              Vocab Master
            </Text>
            <Text className="text-gray-400 font-nunito text-base">
              {t('welcomeBack')}
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-white rounded-2xl p-6">
            <TextInput
              label={t('form.username')}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                clearError();
              }}
              placeholder={t('placeholder.username')}
              autoComplete="username"
              autoFocus
              editable={!state.isLoading}
            />

            <TextInput
              label={t('form.password')}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearError();
              }}
              placeholder={t('placeholder.password')}
              secureTextEntry
              autoComplete="password"
              editable={!state.isLoading}
            />

            <ErrorMessage message={state.error} />

            <Button
              onPress={handleLogin}
              disabled={!username.trim() || !password.trim()}
              loading={state.isLoading}
              icon={<LogIn size={20} color={colors.white} />}
            >
              {state.isLoading ? t('signingIn') : t('signIn')}
            </Button>

            {/* Google Sign-In */}
            <View className="mt-4">
              <View className="flex-row items-center gap-3 mb-4">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="text-gray-400 font-nunito text-sm">{t('or', 'or')}</Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>
              <GoogleSignInButton
                onSuccess={(idToken) => {
                  googleLogin(idToken).catch(() => {});
                }}
                disabled={state.isLoading}
              />
            </View>

            {/* Links */}
            <View className="items-center mt-6 gap-3">
              <View className="flex-row items-center">
                <Text className="text-gray-400 font-nunito">
                  {t('noAccount')}{' '}
                </Text>
                <Pressable
                  onPress={() => router.push('/(auth)/register')}
                  disabled={state.isLoading}
                >
                  <Text className="text-primary-600 font-nunito-semibold">
                    {t('createOne')}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => router.push('/(auth)/forgot-password')}
                disabled={state.isLoading}
                className="flex-row items-center gap-1"
              >
                <KeyRound size={14} color={colors.gray[500]} />
                <Text className="text-gray-500 font-nunito text-sm">
                  {t('forgotPassword')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
