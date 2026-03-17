import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { VocabularyWord } from '../../types';
import { getRandomElement } from '../../utils';
import { PronunciationButton } from '../common/PronunciationButton';

interface FlashCardProps {
  word: VocabularyWord;
  isFlipped: boolean;
  onFlip: () => void;
}

export function FlashCard({ word, isFlipped, onFlip }: FlashCardProps) {
  const { t } = useTranslation('study');
  // Get a random example sentence
  const exampleSentence = word.exampleSentence.length > 0
    ? getRandomElement(word.exampleSentence)
    : null;

  // Highlight the target word in the example sentence
  const renderExampleWithHighlight = (sentence: string) => {
    const escaped = word.targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = sentence.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === word.targetWord.toLowerCase()) {
        return (
          <span key={index} className="font-bold italic text-gray-800">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      className="perspective-1000 w-full cursor-pointer"
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFlip();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={isFlipped ? t('showWord') : t('showDefinition')}
    >
      <motion.div
        className="relative w-full preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front of card - Word */}
        <div
          className={`
            w-full min-h-[280px] sm:min-h-[320px] md:min-h-[400px] lg:min-h-[480px] xl:min-h-[540px] 2xl:min-h-[600px]
            bg-white rounded-2xl lg:rounded-3xl shadow-card
            flex flex-col items-center justify-center
            p-6 md:p-8 lg:p-12 xl:p-14 backface-hidden
            ${isFlipped ? 'invisible' : ''}
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold text-gray-900 text-center">
              {word.targetWord}
            </h2>
            <PronunciationButton word={word.targetWord} />
          </div>
          <p className="mt-6 lg:mt-8 text-sm md:text-base lg:text-lg text-gray-400">
            {t('clickToFlip')}
          </p>
        </div>

        {/* Back of card - Definition */}
        <div
          className={`
            absolute top-0 left-0
            w-full min-h-[280px] sm:min-h-[320px] md:min-h-[400px] lg:min-h-[480px] xl:min-h-[540px] 2xl:min-h-[600px]
            bg-white rounded-2xl lg:rounded-3xl shadow-card
            p-6 md:p-8 lg:p-12 xl:p-14 backface-hidden rotate-y-180
            flex flex-col
            ${!isFlipped ? 'invisible' : ''}
          `}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Definitions */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-xs md:text-sm lg:text-base font-semibold text-gray-400 uppercase tracking-wide mb-2 md:mb-3 lg:mb-4">
              {t('definition')}
            </h3>
            <ul className="space-y-2 md:space-y-3 lg:space-y-4">
              {word.definition.map((def, index) => (
                <li
                  key={index}
                  className="text-gray-700 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl flex items-start gap-2 lg:gap-3"
                >
                  <span className="text-primary-500 mt-1">•</span>
                  <span>{def}</span>
                </li>
              ))}
            </ul>

            {/* Synonyms */}
            {word.synonyms.length > 0 && (
              <div className="mt-4 md:mt-6 lg:mt-8">
                <h3 className="text-xs md:text-sm lg:text-base font-semibold text-gray-400 uppercase tracking-wide mb-2 md:mb-3 lg:mb-4">
                  {t('synonyms')}
                </h3>
                <div className="flex flex-wrap gap-2 md:gap-3 lg:gap-4">
                  {word.synonyms.map((synonym, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 md:px-4 md:py-1.5 lg:px-5 lg:py-2 bg-primary-100 text-primary-700 rounded-full text-sm md:text-base lg:text-lg font-medium"
                    >
                      {synonym}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Example sentence */}
            {exampleSentence && (
              <div className="mt-4 md:mt-6 lg:mt-8">
                <h3 className="text-xs md:text-sm lg:text-base font-semibold text-gray-400 uppercase tracking-wide mb-2 md:mb-3 lg:mb-4">
                  {t('example')}
                </h3>
                <p className="text-gray-600 text-sm md:text-base lg:text-lg xl:text-xl">
                  "{renderExampleWithHighlight(exampleSentence)}"
                </p>
              </div>
            )}
          </div>

          <p className="mt-4 lg:mt-6 text-xs md:text-sm lg:text-base text-gray-400 text-center">
            {t('clickToFlipBack')}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
