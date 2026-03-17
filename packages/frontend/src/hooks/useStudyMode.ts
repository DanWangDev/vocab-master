import { useState, useCallback, useMemo } from 'react';
import type { VocabularyWord } from '../types';
import { shuffleArray } from '../utils';

interface UseStudyModeReturn {
  currentCard: VocabularyWord | null;
  currentIndex: number;
  totalCards: number;
  isFlipped: boolean;
  flip: () => void;
  nextCard: () => void;
  prevCard: () => void;
  resetDeck: () => void;
}

export function useStudyMode(words: VocabularyWord[]): UseStudyModeReturn {
  const [shuffledWords, setShuffledWords] = useState<VocabularyWord[]>(() =>
    shuffleArray(words)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = useMemo(() => {
    return shuffledWords[currentIndex] || null;
  }, [shuffledWords, currentIndex]);

  const totalCards = shuffledWords.length;

  const flip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const nextCard = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev < shuffledWords.length - 1) {
        return prev + 1;
      }
      return prev;
    });
    setIsFlipped(false);  // Reset to front when navigating
  }, [shuffledWords.length]);

  const prevCard = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev > 0) {
        return prev - 1;
      }
      return prev;
    });
    setIsFlipped(false);  // Reset to front when navigating
  }, []);

  const resetDeck = useCallback(() => {
    setShuffledWords(shuffleArray(words));
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [words]);

  return {
    currentCard,
    currentIndex,
    totalCards,
    isFlipped,
    flip,
    nextCard,
    prevCard,
    resetDeck,
  };
}
