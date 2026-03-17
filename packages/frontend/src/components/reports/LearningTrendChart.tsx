import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { LearningTrendPoint } from '../../services/api/reportApi';

interface LearningTrendChartProps {
  trend: LearningTrendPoint[];
}

export function LearningTrendChart({ trend }: LearningTrendChartProps) {
  const { t } = useTranslation('reports');

  if (trend.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{t('learningTrend')}</h3>
        <p className="text-gray-400 text-sm text-center py-4">{t('noTrendData')}</p>
      </div>
    );
  }

  const maxAccuracy = 100;
  const maxQuizzes = Math.max(...trend.map(t => t.quizzes), 1);
  const maxWords = Math.max(...trend.map(t => t.wordsStudied), 1);

  // Only show labels for every ~7th day
  const labelInterval = Math.max(1, Math.floor(trend.length / 5));

  return (
    <div className="bg-white rounded-2xl shadow-card p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{t('learningTrend')}</h3>

      {/* Accuracy chart */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-sky-500" />
          <span className="text-xs text-gray-500 font-medium">{t('accuracy')}</span>
        </div>
        <div className="flex items-end gap-[2px] h-20">
          {trend.map((point, i) => {
            const height = maxAccuracy > 0 ? (point.accuracy / maxAccuracy) * 100 : 0;
            return (
              <motion.div
                key={point.date}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(height, 2)}%` }}
                transition={{ duration: 0.4, delay: i * 0.01 }}
                className={`flex-1 rounded-t ${point.accuracy > 0 ? 'bg-sky-400' : 'bg-gray-100'}`}
                title={`${point.date}: ${point.accuracy}%`}
              />
            );
          })}
        </div>
        <div className="flex gap-[2px]">
          {trend.map((point, i) => (
            <div key={point.date} className="flex-1 text-center">
              {i % labelInterval === 0 && (
                <span className="text-[9px] text-gray-400">
                  {point.date.slice(5)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Activity summary (quizzes + words) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-xs text-gray-500 font-medium">{t('quizzes')}</span>
          </div>
          <div className="flex items-end gap-[2px] h-12">
            {trend.map((point, i) => {
              const height = maxQuizzes > 0 ? (point.quizzes / maxQuizzes) * 100 : 0;
              return (
                <motion.div
                  key={point.date}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 2)}%` }}
                  transition={{ duration: 0.3, delay: i * 0.01 }}
                  className={`flex-1 rounded-t ${point.quizzes > 0 ? 'bg-violet-400' : 'bg-gray-100'}`}
                  title={`${point.date}: ${point.quizzes} quizzes`}
                />
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-500 font-medium">{t('wordsStudied')}</span>
          </div>
          <div className="flex items-end gap-[2px] h-12">
            {trend.map((point, i) => {
              const height = maxWords > 0 ? (point.wordsStudied / maxWords) * 100 : 0;
              return (
                <motion.div
                  key={point.date}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 2)}%` }}
                  transition={{ duration: 0.3, delay: i * 0.01 }}
                  className={`flex-1 rounded-t ${point.wordsStudied > 0 ? 'bg-emerald-400' : 'bg-gray-100'}`}
                  title={`${point.date}: ${point.wordsStudied} words`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
