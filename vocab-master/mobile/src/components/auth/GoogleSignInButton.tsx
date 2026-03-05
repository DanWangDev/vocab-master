import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { colors } from '../../theme/colors';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_WEB =
  Constants.expoConfig?.extra?.googleClientIdWeb ??
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ??
  '';

const GOOGLE_CLIENT_ID_IOS =
  Constants.expoConfig?.extra?.googleClientIdIos ??
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ??
  '';

const GOOGLE_CLIENT_ID_ANDROID =
  Constants.expoConfig?.extra?.googleClientIdAndroid ??
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ??
  '';

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({ onSuccess, onError, disabled }: GoogleSignInButtonProps) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID_WEB,
    iosClientId: GOOGLE_CLIENT_ID_IOS || undefined,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID || undefined,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (idToken) {
        onSuccess(idToken);
      } else {
        onError?.('No ID token received from Google');
      }
    } else if (response?.type === 'error') {
      onError?.(response.error?.message ?? 'Google sign-in failed');
    }
  }, [response, onSuccess, onError]);

  const isConfigured = Boolean(GOOGLE_CLIENT_ID_WEB || GOOGLE_CLIENT_ID_IOS || GOOGLE_CLIENT_ID_ANDROID);

  if (!isConfigured) return null;

  return (
    <Pressable
      onPress={() => promptAsync()}
      disabled={!request || disabled}
      className="flex-row items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl py-3 px-4"
      style={{ opacity: (!request || disabled) ? 0.5 : 1 }}
    >
      <View className="w-5 h-5 items-center justify-center">
        <Text className="text-lg font-nunito-bold" style={{ color: colors.primary[600] }}>G</Text>
      </View>
      <Text className="font-nunito-semibold text-gray-700">
        Continue with Google
      </Text>
    </Pressable>
  );
}
