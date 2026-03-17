import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Frown, Minus, Loader2 } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { pvpApi } from '../../services/api/pvpApi';
import { useAuth } from '../../contexts/AuthContext';
import type { PvpChallenge } from '../../services/api/pvpApi';

export function ChallengeResults() {
  const { t } = useTranslation('pvp');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { state: authState } = useAuth();
  const userId = authState.user?.id;

  const [challenge, setChallenge] = useState<PvpChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pvpApi.getChallenge(Number(id))
      .then(data => {
        setChallenge(data.challenge);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F9FF]">
        <Loader2 size={40} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-[#F0F9FF]">
        <TopBar title={t('resultsTitle')} onBack={() => navigate('/pvp')} />
        <p className="text-center pt-12 text-gray-500">Challenge not found</p>
      </div>
    );
  }

  const isCompleted = challenge.status === 'completed';
  const isWaiting = challenge.status === 'active';
  const isDraw = isCompleted && challenge.winner_id === null;
  const isWinner = isCompleted && challenge.winner_id === userId;

  const myScore = challenge.challenger_id === userId ? challenge.challenger_score : challenge.opponent_score;
  const opponentScore = challenge.challenger_id === userId ? challenge.opponent_score : challenge.challenger_score;
  const opponentName = challenge.challenger_id === userId
    ? (challenge.opponent_display_name || challenge.opponent_username)
    : (challenge.challenger_display_name || challenge.challenger_username);

  const resultIcon = isDraw ? Minus : isWinner ? Trophy : Frown;
  const ResultIcon = resultIcon;
  const resultBg = isDraw ? 'from-yellow-400 to-amber-500' : isWinner ? 'from-green-400 to-emerald-500' : 'from-red-400 to-rose-500';
  const resultText = isDraw ? t('drawResult') : isWinner ? t('winner') : t('loser');

  return (
    <div className="min-h-screen bg-[#F0F9FF] background-pattern">
      <TopBar
        title={t('resultsTitle')}
        onBack={() => navigate('/pvp')}
      />

      <main className="max-w-xl mx-auto px-4 pt-6 pb-20">
        {isWaiting ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-yellow-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">{t('waiting')}</h2>
            <p className="text-gray-500 text-sm">
              {myScore !== null && `${t('yourScore')}: ${myScore}`}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Result header */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-gradient-to-br ${resultBg} rounded-3xl p-8 text-center text-white mb-6 shadow-lg`}
            >
              <ResultIcon size={48} className="mx-auto mb-3 drop-shadow-md" />
              <h2 className="text-2xl font-black mb-1">{resultText}</h2>
              <p className="text-white/80 text-sm">{t('vs')} {opponentName}</p>
            </motion.div>

            {/* Score comparison */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6"
            >
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">{t('you')}</p>
                  <p className={`text-4xl font-black ${isWinner ? 'text-green-500' : isDraw ? 'text-yellow-500' : 'text-gray-700'}`}>
                    {myScore ?? '-'}
                  </p>
                </div>
                <div className="text-3xl font-black text-gray-200">-</div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">{opponentName}</p>
                  <p className={`text-4xl font-black ${!isWinner && !isDraw ? 'text-green-500' : isDraw ? 'text-yellow-500' : 'text-gray-700'}`}>
                    {opponentScore ?? '-'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Wordlist info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6"
            >
              <p className="text-sm text-gray-500">
                {t('wordlist', { name: challenge.wordlist_name })} · {challenge.question_count} {t('questionCount').toLowerCase()}
              </p>
            </motion.div>
          </>
        )}

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate('/pvp')}
          className="w-full py-3 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 font-bold cursor-pointer hover:bg-gray-50 transition-colors"
        >
          {t('backToList')}
        </motion.button>
      </main>
    </div>
  );
}
