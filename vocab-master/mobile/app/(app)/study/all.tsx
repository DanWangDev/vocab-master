import { useRef, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react-native';
import { FlashCard } from '../../../src/components/study/FlashCard';
import { ProgressBar } from '../../../src/components/study/ProgressBar';
import { useApp } from '../../../src/contexts';
import { useStudyMode } from '../../../src/hooks';
import { ApiService } from '../../../src/services';
import { colors } from '../../../src/theme';

export default function StudyAllScreen() {
  const { t } = useTranslation('study');
  const router = useRouter();
  const { vocabulary, loadUserData } = useApp();
  const {
    currentCard,
    currentIndex,
    totalCards,
    isFlipped,
    flip,
    nextCard,
    prevCard,
    resetDeck,
  } = useStudyMode(vocabulary);

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

  if (!currentCard) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500 font-nunito">{t('noVocabulary')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-blue-50" edges={['top']}>
      {/* Header */}
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
        {/* Progress */}
        <View className="mb-6">
          <ProgressBar
            current={currentIndex + 1}
            total={totalCards}
            color={colors.study.DEFAULT}
          />
        </View>

        {/* Card with navigation */}
        <View className="flex-row items-center gap-3 flex-1">
          {/* Previous */}
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

          {/* Card */}
          <View className="flex-1">
            <FlashCard word={currentCard} isFlipped={isFlipped} onFlip={flip} />
          </View>

          {/* Next */}
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
