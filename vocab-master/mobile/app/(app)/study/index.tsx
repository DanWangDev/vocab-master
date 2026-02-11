import { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BookOpen, AlertCircle, ArrowLeft } from 'lucide-react-native';
import { ApiService } from '../../../src/services';
import { colors } from '../../../src/theme';
import { shadows } from '../../../src/theme';

interface WeakWord {
  word: string;
  incorrectCount: number;
  correctCount: number;
  totalAttempts: number;
  accuracy: number;
}

export default function StudyLandingScreen() {
  const { t } = useTranslation('study');
  const router = useRouter();
  const [weakWords, setWeakWords] = useState<WeakWord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiService.getWeakWords()
      .then((data) => setWeakWords(data.weakWords))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-blue-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color={colors.gray[700]} />
        </Pressable>
        <Text className="text-lg font-nunito-bold text-gray-800 ml-2">
          {t('title')}
        </Text>
      </View>

      <View className="flex-1 px-4 pt-6 gap-4">
        {/* Study All Words */}
        <Pressable
          onPress={() => router.push('/(app)/study/all')}
          style={shadows.md}
          className="bg-white rounded-2xl p-6 active:opacity-90"
        >
          <View className="flex-row items-start gap-4">
            <View className="p-4 rounded-2xl bg-blue-500">
              <BookOpen size={32} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-nunito-bold text-gray-900 mb-1">
                {t('studyAllWords')}
              </Text>
              <Text className="text-gray-500 text-sm font-nunito">
                {t('studyAllWordsDesc')}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Practice Mistakes */}
        <Pressable
          onPress={weakWords.length > 0 ? () => router.push('/(app)/study/mistakes') : undefined}
          disabled={weakWords.length === 0}
          style={shadows.md}
          className={`bg-white rounded-2xl p-6 ${
            weakWords.length === 0 ? 'opacity-60' : 'active:opacity-90'
          }`}
        >
          <View className="flex-row items-start gap-4">
            <View
              className="p-4 rounded-2xl"
              style={{
                backgroundColor: weakWords.length > 0 ? '#f97316' : colors.gray[300],
              }}
            >
              <AlertCircle size={32} color="white" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-xl font-nunito-bold text-gray-900">
                  {t('practiceMistakes')}
                </Text>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.gray[400]} />
                ) : weakWords.length > 0 ? (
                  <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                    <Text className="text-orange-600 text-xs font-nunito-bold">
                      {weakWords.length} words
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-gray-500 text-sm font-nunito">
                {loading
                  ? t('practiceMistakesLoading')
                  : weakWords.length > 0
                  ? t('practiceMistakesDesc')
                  : t('practiceMistakesEmpty')}
              </Text>
            </View>
          </View>

          {/* Preview of weak words */}
          {weakWords.length > 0 && (
            <View className="mt-4 pt-4 border-t border-gray-100">
              <Text className="text-xs text-gray-400 font-nunito-semibold mb-2">
                {t('wordsToPractice')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {weakWords.slice(0, 5).map((w) => (
                  <View
                    key={w.word}
                    className="px-2 py-1 bg-orange-50 rounded-full"
                  >
                    <Text className="text-orange-700 text-xs font-nunito-semibold">
                      {w.word}
                    </Text>
                  </View>
                ))}
                {weakWords.length > 5 && (
                  <View className="px-2 py-1 bg-gray-100 rounded-full">
                    <Text className="text-gray-500 text-xs font-nunito">
                      {t('moreWords', { count: weakWords.length - 5 })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
