import { useTranslation } from 'react-i18next';
import type { WordMasterySummary } from '../../services/api/reportApi';

interface WordMasteryListProps {
  title: string;
  words: WordMasterySummary[];
  variant: 'weak' | 'strong';
}

const MASTERY_LABELS = ['New', 'Learning', 'Familiar', 'Mastered'];
const MASTERY_COLORS = [
  'bg-gray-100 text-gray-600',
  'bg-amber-100 text-amber-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
];

export function WordMasteryList({ title, words, variant }: WordMasteryListProps) {
  const { t } = useTranslation('reports');

  if (words.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>

      <div className="space-y-2">
        {words.map(word => (
          <div
            key={word.word}
            className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-800">{word.word}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MASTERY_COLORS[word.masteryLevel]}`}>
                {MASTERY_LABELS[word.masteryLevel]}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className={variant === 'weak' ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                {word.accuracy}%
              </span>
              <span className="text-gray-400">
                {word.correctCount}/{word.correctCount + word.incorrectCount}
              </span>
            </div>
          </div>
        ))}
      </div>

      {variant === 'weak' && words.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          {t('weakWordsHint')}
        </p>
      )}
    </div>
  );
}
