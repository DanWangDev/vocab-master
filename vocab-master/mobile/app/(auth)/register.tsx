import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Users, ArrowLeft, UserPlus } from 'lucide-react-native';
import { useAuth } from '../../src/contexts';
import { TextInput, Button, ErrorMessage } from '../../src/components/common';
import { colors } from '../../src/theme';

type RegisterStep = 'role' | 'student' | 'parent';

export default function RegisterScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const { registerStudent, registerParent, state, clearError } = useAuth();
  const [step, setStep] = useState<RegisterStep>('role');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setEmail('');
    setValidationError(null);
    clearError();
  };

  const validateStudent = (): boolean => {
    if (username.length < 3) {
      setValidationError(t('validation.usernameMin'));
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setValidationError(t('validation.usernameChars'));
      return false;
    }
    if (password.length < 6) {
      setValidationError(t('validation.passwordMin'));
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError(t('validation.passwordsNoMatch'));
      return false;
    }
    setValidationError(null);
    return true;
  };

  const validateParent = (): boolean => {
    if (!validateStudent()) return false;
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

  const handleStudentRegister = async () => {
    if (!validateStudent()) return;
    try {
      await registerStudent(username.trim(), password, displayName.trim() || undefined);
    } catch {
      // Error handled by context
    }
  };

  const handleParentRegister = async () => {
    if (!validateParent()) return;
    try {
      await registerParent(username.trim(), password, email.trim(), displayName.trim() || undefined);
    } catch {
      // Error handled by context
    }
  };

  const displayedError = validationError || state.error;

  // Role selection
  if (step === 'role') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8">
          <View className="items-center mb-8">
            <Text className="text-2xl font-nunito-bold text-gray-800 mb-2">
              {t('roleSelection.title')}
            </Text>
            <Text className="text-gray-600 font-nunito text-center">
              {t('roleSelection.subtitle')}
            </Text>
          </View>

          <View className="gap-4 mb-8">
            <Pressable
              onPress={() => {
                resetForm();
                setStep('student');
              }}
              className="p-5 bg-indigo-50 border-2 border-indigo-200 rounded-2xl flex-row items-center gap-4 active:bg-indigo-100"
            >
              <View className="w-14 h-14 bg-indigo-100 rounded-xl items-center justify-center">
                <GraduationCap size={28} color="#4f46e5" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-nunito-bold text-gray-800">
                  {t('roleSelection.student')}
                </Text>
                <Text className="text-sm font-nunito text-gray-600">
                  {t('roleSelection.studentDesc')}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                resetForm();
                setStep('parent');
              }}
              className="p-5 bg-purple-50 border-2 border-purple-200 rounded-2xl flex-row items-center gap-4 active:bg-purple-100"
            >
              <View className="w-14 h-14 bg-purple-100 rounded-xl items-center justify-center">
                <Users size={28} color="#7c3aed" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-nunito-bold text-gray-800">
                  {t('roleSelection.parent')}
                </Text>
                <Text className="text-sm font-nunito text-gray-600">
                  {t('roleSelection.parentDesc')}
                </Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center justify-center gap-2"
          >
            <ArrowLeft size={18} color={colors.gray[500]} />
            <Text className="text-gray-500 font-nunito-semibold">
              {t('backToSignIn')}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Student or Parent form
  const isParent = step === 'parent';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 py-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="items-center mb-6">
            <View
              className={`w-12 h-12 rounded-xl items-center justify-center mb-3 ${
                isParent ? 'bg-purple-100' : 'bg-indigo-100'
              }`}
            >
              {isParent ? (
                <Users size={24} color="#7c3aed" />
              ) : (
                <GraduationCap size={24} color="#4f46e5" />
              )}
            </View>
            <Text className="text-xl font-nunito-bold text-gray-800">
              {isParent ? t('parentAccount') : t('studentAccount')}
            </Text>
            <Text className="text-sm font-nunito text-gray-500 text-center">
              {isParent ? t('parentAccountDesc') : t('studentAccountDesc')}
            </Text>
          </View>

          <TextInput
            label={t('form.username')}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setValidationError(null);
            }}
            placeholder={isParent ? t('placeholder.chooseUsername') : t('placeholder.pickUsername')}
            autoComplete="username"
            autoFocus
            editable={!state.isLoading}
            hint={t('hint.usernameChars')}
          />

          {isParent && (
            <TextInput
              label={t('form.emailAddress')}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setValidationError(null);
              }}
              placeholder={t('placeholder.email')}
              keyboardType="email-address"
              autoComplete="email"
              editable={!state.isLoading}
              hint={t('hint.emailRecovery')}
            />
          )}

          <TextInput
            label={t('form.yourName')}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={isParent ? t('placeholder.parentName') : t('placeholder.yourName')}
            autoComplete="name"
            autoCapitalize="words"
            editable={!state.isLoading}
            optional
          />

          <TextInput
            label={t('form.password')}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setValidationError(null);
            }}
            placeholder={isParent ? t('placeholder.createPassword') : t('placeholder.secretPassword')}
            secureTextEntry
            autoComplete="password"
            editable={!state.isLoading}
            hint={t('hint.minPassword')}
          />

          <TextInput
            label={t('form.confirmPassword')}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setValidationError(null);
            }}
            placeholder={t('placeholder.typePasswordAgain')}
            secureTextEntry
            editable={!state.isLoading}
          />

          <ErrorMessage message={displayedError} />

          <Button
            onPress={isParent ? handleParentRegister : handleStudentRegister}
            disabled={
              !username.trim() ||
              !password.trim() ||
              !confirmPassword.trim() ||
              (isParent && !email.trim())
            }
            loading={state.isLoading}
            icon={<UserPlus size={20} color={colors.white} />}
            className={isParent ? 'bg-purple-600' : ''}
          >
            {state.isLoading ? t('creatingAccount') : t('createAccount')}
          </Button>

          <Pressable
            onPress={() => setStep('role')}
            disabled={state.isLoading}
            className="flex-row items-center justify-center gap-2 mt-6"
          >
            <ArrowLeft size={18} color={colors.gray[500]} />
            <Text className="text-gray-500 font-nunito-semibold">
              {t('back')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
