import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download } from 'lucide-react';
import { reportApi } from '../../services/api/reportApi';
import type { MasteryResponse, LearningTrendPoint } from '../../services/api/reportApi';
import { MasteryBreakdown } from './MasteryBreakdown';
import { LearningTrendChart } from './LearningTrendChart';
import { WordMasteryList } from './WordMasteryList';

export function ReportsPage() {
  const { t } = useTranslation('reports');
  const navigate = useNavigate();
  const [mastery, setMastery] = useState<MasteryResponse | null>(null);
  const [trend, setTrend] = useState<LearningTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reportApi.getMastery(),
      reportApi.getLearningTrend(30),
    ]).then(([masteryData, trendData]) => {
      setMastery(masteryData);
      setTrend(trendData.trend);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleExport = () => {
    window.open(reportApi.getMyExportUrl(), '_blank');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-black text-gray-800">{t('title')}</h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-sky-600 bg-sky-50 rounded-xl hover:bg-sky-100 transition-colors"
        >
          <Download size={16} />
          {t('exportCsv')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-4"
        >
          {mastery && <MasteryBreakdown breakdown={mastery.breakdown} />}
          <LearningTrendChart trend={trend} />
          {mastery && (
            <>
              <WordMasteryList
                title={t('weakWords')}
                words={mastery.weakWords}
                variant="weak"
              />
              <WordMasteryList
                title={t('strongWords')}
                words={mastery.strongWords}
                variant="strong"
              />
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
