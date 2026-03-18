import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Clock, Trophy, Plus, Check, X, Play, Eye, Loader2, XCircle } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { UserMenu } from '../common/UserMenu';
import { NotificationBell } from '../notifications/NotificationBell';
import { CreateChallengeModal } from './CreateChallengeModal';
import { pvpApi } from '../../services/api/pvpApi';
import { useAuth } from '../../contexts/AuthContext';
import type { PvpChallenge } from '../../services/api/pvpApi';

type Tab = 'pending' | 'active' | 'history';

export function ChallengeList() {
  const { t } = useTranslation('pvp');
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const userId = authState.user?.id;

  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<PvpChallenge[]>([]);
  const [active, setActive] = useState<PvpChallenge[]>([]);
  const [history, setHistory] = useState<PvpChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, a, h] = await Promise.all([
        pvpApi.getPending(),
        pvpApi.getActive(),
        pvpApi.getHistory(),
      ]);
      setPending(p.challenges);
      setActive(a.challenges);
      setHistory(h.challenges);
    } catch {
      setError(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAccept = async (id: number) => {
    try {
      await pvpApi.acceptChallenge(id);
      loadData();
    } catch {
      setError(t('acceptError'));
    }
  };

  const handleDecline = async (id: number) => {
    try {
      await pvpApi.declineChallenge(id);
      loadData();
    } catch {
      setError(t('declineError'));
    }
  };

  const getOpponentName = (challenge: PvpChallenge) => {
    const isChallenger = challenge.challenger_id === userId;
    if (isChallenger) {
      return challenge.opponent_display_name || challenge.opponent_username;
    }
    return challenge.challenger_display_name || challenge.challenger_username;
  };

  const getChallengeStatus = (challenge: PvpChallenge) => {
    if (challenge.status === 'completed') {
      if (challenge.winner_id === null) return 'draw';
      return challenge.winner_id === userId ? 'won' : 'lost';
    }
    return challenge.status;
  };

  const statusColors: Record<string, string> = {
    won: 'bg-green-100 text-green-700',
    lost: 'bg-red-100 text-red-700',
    draw: 'bg-yellow-100 text-yellow-700',
    expired: 'bg-gray-100 text-gray-500',
    declined: 'bg-gray-100 text-gray-500',
    pending: 'bg-blue-100 text-blue-700',
    active: 'bg-orange-100 text-orange-700',
  };

  const renderChallenge = (challenge: PvpChallenge) => {
    const status = getChallengeStatus(challenge);
    const isOpponent = challenge.opponent_id === userId;
    const isPending = challenge.status === 'pending' && isOpponent;
    const isActive = challenge.status === 'active';
    const isCompleted = challenge.status === 'completed';

    // Check if user already submitted in active challenge
    const hasSubmitted = isActive && (
      (challenge.challenger_id === userId && challenge.challenger_score !== null) ||
      (challenge.opponent_id === userId && challenge.opponent_score !== null)
    );

    return (
      <motion.div
        key={challenge.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Swords size={16} className="text-red-500" />
            <span className="font-bold text-gray-900">{t('vs')} {getOpponentName(challenge)}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[status] || 'bg-gray-100 text-gray-500'}`}>
            {t(status as 'won' | 'lost' | 'draw' | 'expired' | 'declined' | 'completed')}
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          {t('wordlist', { name: challenge.wordlist_name })} · {challenge.question_count} {t('questionCount').toLowerCase()}
        </p>

        {/* Score display for completed */}
        {isCompleted && challenge.challenger_score !== null && challenge.opponent_score !== null && (
          <div className="flex items-center gap-4 mb-3 bg-gray-50 rounded-xl p-3">
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500">
                {challenge.challenger_id === userId ? t('you') : (challenge.challenger_display_name || challenge.challenger_username)}
              </p>
              <p className="text-2xl font-black text-gray-900">{challenge.challenger_score}</p>
            </div>
            <span className="text-gray-300 font-bold">-</span>
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500">
                {challenge.opponent_id === userId ? t('you') : (challenge.opponent_display_name || challenge.opponent_username)}
              </p>
              <p className="text-2xl font-black text-gray-900">{challenge.opponent_score}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {isPending && (
            <>
              <button
                onClick={() => handleAccept(challenge.id)}
                className="flex-1 py-2 rounded-xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-1 cursor-pointer hover:bg-green-600 transition-colors"
              >
                <Check size={14} /> {t('accept')}
              </button>
              <button
                onClick={() => handleDecline(challenge.id)}
                className="flex-1 py-2 rounded-xl bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center gap-1 cursor-pointer hover:bg-gray-300 transition-colors"
              >
                <X size={14} /> {t('decline')}
              </button>
            </>
          )}
          {isActive && !hasSubmitted && (
            <button
              onClick={() => navigate(`/pvp/${challenge.id}/play`)}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm flex items-center justify-center gap-1 cursor-pointer hover:shadow-md transition-shadow"
            >
              <Play size={14} /> {t('play')}
            </button>
          )}
          {isActive && hasSubmitted && (
            <div className="flex-1 py-2 rounded-xl bg-yellow-50 text-yellow-700 font-bold text-sm flex items-center justify-center gap-1">
              <Clock size={14} /> {t('waiting')}
            </div>
          )}
          {isCompleted && (
            <button
              onClick={() => navigate(`/pvp/${challenge.id}/results`)}
              className="flex-1 py-2 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center gap-1 cursor-pointer hover:bg-indigo-200 transition-colors"
            >
              <Eye size={14} /> {t('viewResults')}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  const currentList = tab === 'pending' ? pending : tab === 'active' ? active : history;
  const emptyMessage = tab === 'pending' ? t('noPending') : tab === 'active' ? t('noActive') : t('noHistory');

  return (
    <div className="min-h-screen bg-[#F0F9FF] background-pattern">
      <TopBar
        title={t('title')}
        onBack={() => navigate('/')}
        rightContent={
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu />
          </div>
        }
      />

      <main className="max-w-xl mx-auto px-4 pt-4 pb-20">
        {/* Create button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreate(true)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-lg flex items-center justify-center gap-2 mb-6 cursor-pointer shadow-lg shadow-red-200"
        >
          <Plus size={20} />
          {t('createChallenge')}
        </motion.button>

        {/* Error banner */}
        {error && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={loadData}
            className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700 cursor-pointer hover:bg-red-100 transition-colors"
          >
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.button>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['pending', 'active', 'history'] as Tab[]).map(t2 => (
            <button
              key={t2}
              onClick={() => setTab(t2)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                tab === t2
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t2 === 'pending' && <Clock size={14} className="hidden sm:inline mr-1" />}
              {t2 === 'active' && <Swords size={14} className="hidden sm:inline mr-1" />}
              {t2 === 'history' && <Trophy size={14} className="hidden sm:inline mr-1" />}
              <span className="truncate">{t2 === 'pending' ? t('pendingChallenges') : t2 === 'active' ? t('activeChallenges') : t('challengeHistory')}</span>
            </button>
          ))}
        </div>

        {/* Challenge list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {currentList.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Swords size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{emptyMessage}</p>
                </div>
              ) : (
                currentList.map(renderChallenge)
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <CreateChallengeModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadData}
      />
    </div>
  );
}
