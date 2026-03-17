import { useState } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { PronunciationButton } from '../common/PronunciationButton';
import type { SrsReviewItem } from '../../services/api/srsApi';

interface FlashcardCardProps {
  item: SrsReviewItem;
  onSwipe: (direction: 'left' | 'right') => void;
}

const SWIPE_THRESHOLD = 100;

export function FlashcardCard({ item, onSwipe }: FlashcardCardProps) {
  const { t } = useTranslation('flashcard');
  const [isFlipped, setIsFlipped] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const leftOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);
  const rightOpacity = useTransform(x, [0, 50, 150], [0, 0.5, 1]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe('right');
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe('left');
    }
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
    >
      {/* Swipe indicators */}
      <motion.div
        className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-lg shadow-lg"
        style={{ opacity: leftOpacity }}
      >
        <ThumbsDown className="w-5 h-5" />
        {t('dontKnow')}
      </motion.div>
      <motion.div
        className="absolute top-6 right-6 z-10 flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold text-lg shadow-lg"
        style={{ opacity: rightOpacity }}
      >
        {t('know')}
        <ThumbsUp className="w-5 h-5" />
      </motion.div>

      {/* Card */}
      <div
        className="w-full h-full perspective-1000"
        onClick={() => setIsFlipped(prev => !prev)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFlipped(prev => !prev); } }}
        tabIndex={0}
        role="button"
        aria-label={isFlipped ? t('tapToFlip') : t('tapToFlip')}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front - Word */}
          <div
            className={`
              absolute inset-0 bg-white rounded-3xl shadow-lg border border-gray-100
              flex flex-col items-center justify-center p-8
              ${isFlipped ? 'invisible' : ''}
            `}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900">
                {item.word}
              </h2>
              <PronunciationButton word={item.word} />
            </div>
            <p className="text-sm text-gray-400 mt-4">{t('tapToFlip')}</p>

            {/* Mastery indicator */}
            <div className="absolute bottom-6 left-6 right-6 flex justify-between text-xs text-gray-400">
              <span>{['New', 'Learning', 'Familiar', 'Mastered'][item.masteryLevel]}</span>
              <span>{item.correctCount}/{item.correctCount + item.incorrectCount} correct</span>
            </div>
          </div>

          {/* Back - Definition */}
          <div
            className={`
              absolute inset-0 bg-white rounded-3xl shadow-lg border border-gray-100
              flex flex-col p-8 overflow-y-auto
              ${!isFlipped ? 'invisible' : ''}
            `}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.word}</h3>

            {/* Definitions */}
            {item.definitions.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {t('definition')}
                </h4>
                <ul className="space-y-1.5">
                  {item.definitions.map((def, i) => (
                    <li key={i} className="text-gray-700 flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>{def}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Synonyms */}
            {item.synonyms.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {t('synonyms')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {item.synonyms.map((syn, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                      {syn}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Example */}
            {item.exampleSentences.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {t('example')}
                </h4>
                <p className="text-gray-600 italic">"{item.exampleSentences[0]}"</p>
              </div>
            )}

            <p className="text-sm text-gray-400 text-center mt-auto pt-4">{t('tapToFlip')}</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
