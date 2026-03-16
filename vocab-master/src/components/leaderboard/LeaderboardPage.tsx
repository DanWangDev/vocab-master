import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LeaderboardRow } from './LeaderboardRow';
import { leaderboardApi } from '../../services/api/leaderboardApi';
import { useAuth } from '../../contexts/AuthContext';
import type { LeaderboardEntry } from '../../services/api/leaderboardApi';

type Period = 'weekly' | 'monthly' | 'alltime';

export function LeaderboardPage() {
  const { t } = useTranslation('leaderboard');
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const [period, setPeriod] = useState<Period>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    Promise.all([
      leaderboardApi.getLeaderboard(period),
      leaderboardApi.getMyRanking(period),
    ]).then(([lb, ranking]) => {
      setEntries(lb.entries);
      setMyRank(ranking.rank);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [period]);

  const periods: { key: Period; label: string }[] = [
    { key: 'weekly', label: t('weekly') },
    { key: 'monthly', label: t('monthly') },
    { key: 'alltime', label: t('alltime') },
  ];

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-800">{t('title')}</h1>
          {myRank && (
            <p className="text-sm text-sky-600 font-bold">
              {t('yourRank', { rank: myRank })}
            </p>
          )}
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 rounded-2xl p-1">
        {periods.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`
              flex-1 py-2.5 rounded-xl text-sm font-bold transition-all
              ${period === p.key
                ? 'bg-white text-sky-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-gray-400 font-medium">{t('noEntries')}</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-2"
        >
          {entries.map(entry => (
            <LeaderboardRow
              key={entry.userId}
              {...entry}
              isCurrentUser={entry.userId === authState.user?.id}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
