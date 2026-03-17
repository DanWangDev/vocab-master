import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, LogIn, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { groupApi } from '../../services/api/groupApi';
import { useAuth } from '../../contexts/AuthContext';
import type { GroupSummary } from '../../services/api/groupApi';

export function GroupList() {
  const { t } = useTranslation('groups');
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const isParentOrAdmin = authState.user?.role === 'parent' || authState.user?.role === 'admin';

  useEffect(() => {
    groupApi.getGroups()
      .then(data => setGroups(data.groups))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = async () => {
    setJoinError('');
    try {
      await groupApi.joinGroup(joinCode.toUpperCase());
      setShowJoinModal(false);
      setJoinCode('');
      const data = await groupApi.getGroups();
      setGroups(data.groups);
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : t('joinFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

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
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            title={t('joinGroup')}
          >
            <LogIn size={18} />
          </button>
          {isParentOrAdmin && (
            <button
              onClick={() => navigate('/groups/create')}
              className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-colors"
              title={t('createGroup')}
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Group list */}
      {groups.length === 0 ? (
        <div className="text-center py-20">
          <Users size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 font-medium">{t('noGroups')}</p>
          <p className="text-sm text-gray-300 mt-1">{t('noGroupsHint')}</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-3"
        >
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className="w-full p-4 rounded-2xl bg-white border-2 border-gray-100 hover:border-sky-200 hover:shadow-sm transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 truncate">{group.name}</p>
                  {group.description && (
                    <p className="text-sm text-gray-400 truncate mt-0.5">{group.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-400 shrink-0 ml-3">
                  <Users size={14} />
                  <span className="font-medium">{group.memberCount}</span>
                </div>
              </div>
            </button>
          ))}
        </motion.div>
      )}

      {/* Join modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 mx-4 w-full max-w-sm shadow-xl"
          >
            <h2 className="text-lg font-black text-gray-800 mb-4">{t('joinGroup')}</h2>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t('joinCodePlaceholder')}
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none text-center font-mono text-lg tracking-widest uppercase"
            />
            {joinError && (
              <p className="text-red-500 text-sm mt-2">{joinError}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError(''); }}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleJoin}
                disabled={joinCode.length !== 6}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('join')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
