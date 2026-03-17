import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle } from 'lucide-react';

interface FlashcardProgressProps {
  total: number;
  current: number;
  correct: number;
  incorrect: number;
}

export function FlashcardProgress({ total, current, correct, incorrect }: FlashcardProgressProps) {
  const { t } = useTranslation('flashcard');
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {t('cardsRemaining', { count: total - current })}
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            {correct}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <XCircle className="w-4 h-4" />
            {incorrect}
          </span>
        </div>
      </div>
    </div>
  );
}
