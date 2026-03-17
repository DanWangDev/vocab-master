import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react-native';
import type { VocabularyWord } from '@vocab-master/shared';
import { FlashCard } from '../../../src/components/study/FlashCard';
import { ProgressBar } from '../../../src/components/study/ProgressBar';
import { useApp } from '../../../src/contexts';
import { useStudyMode } from '../../../src/hooks';
import { ApiService } from '../../../src/services';
import { colors } from '../../../src/theme';

export default function StudyMistakesScreen() {
  const { t } = useTranslation('study');
  const router = useRouter();
  const { vocabulary, loadUserData } = useApp();
  const [weakWordsList, setWeakWordsList] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndFilter = async () => {
      try {
        const { weakWords } = await ApiService.getWeakWords();
        const weakWordNames = new Set(weakWords.map((w) => w.word.toLowerCase()));
        const filtered = vocabulary.filter((v) =>
          weakWordNames.has(v.targetWord.toLowerCase())
        );
        setWeakWordsList(filtered);
      } catch {
        // No weak words available
      } finally {
        setLoading(false);
      }
    };
    fetchAndFilter();
  }, [vocabulary]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </SafeAreaView>
    );
  }

  if (weakWordsList.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color={colors.gray[700]} />
          </Pressable>
          <Text className="text-lg font-nunito-bold text-gray-800 ml-2">
            {t('practiceMistakes')}
          </Text>
        </View>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-gray-500 font-nunito text-center">
            {t('practiceMistakesEmpty')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <MistakesStudyView words={weakWordsList} />;
}

function MistakesStudyView({ words }: { words: VocabularyWord[] }) {
  const { t } = useTranslation('study');
  const router = useRouter();
  const { loadUserData } = useApp();
  const {
    currentCard,
    currentIndex,
    totalCards,
    isFlipped,
    flip,
    nextCard,
    prevCard,
    resetDeck,
  } = useStudyMode(words);

  const startTimeRef = useRef(Date.now());
  const reviewedWordsRef = useRef(new Set<string>());

  useEffect(() => {
    if (currentCard) {
      reviewedWordsRef.current.add(currentCard.targetWord);
    }
  }, [currentCard]);

  const handleBack = async () => {
    const uniqueWords = reviewedWordsRef.current.size;
    if (uniqueWords > 0) {
      try {
        await ApiService.saveStudySession({
          wordsReviewed: uniqueWords,
          startTime: new Date(startTimeRef.current).toISOString(),
          endTime: new Date().toISOString(),
          words: Array.from(reviewedWordsRef.current),
        });
        await loadUserData();
      } catch {
        // Best effort
      }
    }
    router.back();
  };

  if (!currentCard) return null;

  return (
    <SafeAreaView className="flex-1 bg-orange-50" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable onPress={handleBack} className="p-2 -ml-2">
            <ArrowLeft size={24} color={colors.gray[700]} />
          </Pressable>
          <Text className="text-base font-nunito-semibold text-gray-600 ml-2">
            {t('cardCount', { current: currentIndex + 1, total: totalCards })}
          </Text>
        </View>
        <Pressable onPress={resetDeck} className="p-2">
          <RotateCcw size={20} color={colors.gray[600]} />
        </Pressable>
      </View>

      <View className="flex-1 px-4 pt-4">
        <View className="mb-6">
          <ProgressBar
            current={currentIndex + 1}
            total={totalCards}
            color="#f97316"
          />
        </View>

        <View className="flex-row items-center gap-3 flex-1">
          <Pressable
            onPress={prevCard}
            disabled={currentIndex === 0}
            className={`p-3 rounded-xl bg-white ${
              currentIndex === 0 ? 'opacity-30' : 'active:bg-gray-50'
            }`}
          >
            <ChevronLeft
              size={28}
              color={currentIndex === 0 ? colors.gray[300] : colors.gray[700]}
            />
          </Pressable>

          <View className="flex-1">
            <FlashCard word={currentCard} isFlipped={isFlipped} onFlip={flip} />
          </View>

          <Pressable
            onPress={nextCard}
            disabled={currentIndex === totalCards - 1}
            className={`p-3 rounded-xl bg-white ${
              currentIndex === totalCards - 1 ? 'opacity-30' : 'active:bg-gray-50'
            }`}
          >
            <ChevronRight
              size={28}
              color={
                currentIndex === totalCards - 1
                  ? colors.gray[300]
                  : colors.gray[700]
              }
            />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
