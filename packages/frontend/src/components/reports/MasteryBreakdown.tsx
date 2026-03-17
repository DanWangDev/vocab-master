import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { MasteryBreakdown as MasteryBreakdownType } from '../../services/api/reportApi';

interface MasteryBreakdownProps {
  breakdown: MasteryBreakdownType;
}

const LEVELS = [
  { key: 'mastered', color: 'bg-green-500', label: 'mastered' },
  { key: 'familiar', color: 'bg-blue-500', label: 'familiar' },
  { key: 'learning', color: 'bg-amber-500', label: 'learning' },
  { key: 'new', color: 'bg-gray-300', label: 'new' },
] as const;

export function MasteryBreakdown({ breakdown }: MasteryBreakdownProps) {
  const { t } = useTranslation('reports');

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{t('masteryBreakdown')}</h3>

      {breakdown.total === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">{t('noMasteryData')}</p>
      ) : (
        <>
          {/* Progress bar */}
          <div className="flex h-4 rounded-full overflow-hidden mb-4">
            {LEVELS.map(level => {
              const count = breakdown[level.key];
              const pct = breakdown.total > 0 ? (count / breakdown.total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <motion.div
                  key={level.key}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`${level.color} first:rounded-l-full last:rounded-r-full`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-3">
            {LEVELS.map(level => {
              const count = breakdown[level.key];
              return (
                <div key={level.key} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${level.color}`} />
                  <span className="text-sm text-gray-600">
                    {t(`level_${level.key}`)}
                  </span>
                  <span className="text-sm font-bold text-gray-800 ml-auto">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 text-center">
            <span className="text-sm text-gray-500">{t('totalWords')}: </span>
            <span className="text-sm font-bold text-gray-800">{breakdown.total}</span>
          </div>
        </>
      )}
    </div>
  );
}
