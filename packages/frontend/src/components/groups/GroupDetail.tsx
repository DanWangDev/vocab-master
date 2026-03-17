import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Check, Trash2, UserMinus, BookOpen } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { groupApi } from '../../services/api/groupApi';
import { useAuth } from '../../contexts/AuthContext';
import type { GroupDetail as GroupDetailType } from '../../services/api/groupApi';

export function GroupDetail() {
  const { t } = useTranslation('groups');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { state: authState } = useAuth();
  const [group, setGroup] = useState<GroupDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const userId = authState.user?.id;
  const myMember = group?.members.find(m => m.userId === userId);
  const isOwnerOrAdmin = myMember?.role === 'owner' || myMember?.role === 'admin';

  useEffect(() => {
    if (!id) return;
    groupApi.getGroup(parseInt(id, 10))
      .then(setGroup)
      .catch(() => navigate('/groups'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleCopyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = async (targetUserId: number) => {
    if (!group) return;
    await groupApi.removeMember(group.id, targetUserId);
    setGroup(prev => prev ? {
      ...prev,
      members: prev.members.filter(m => m.userId !== targetUserId),
      memberCount: prev.memberCount - 1,
    } : null);
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    await groupApi.deleteGroup(group.id);
    navigate('/groups');
  };

  const handleUnassignWordlist = async (wordlistId: number) => {
    if (!group) return;
    await groupApi.unassignWordlist(group.id, wordlistId);
    setGroup(prev => prev ? {
      ...prev,
      wordlists: prev.wordlists.filter(w => w.wordlistId !== wordlistId),
    } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/groups')} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-gray-800 truncate">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-gray-500">{group.description}</p>
          )}
        </div>
      </div>

      {/* Join code */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-sky-50 border-2 border-sky-100 rounded-2xl p-4 mb-6"
      >
        <p className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-2">{t('joinCode')}</p>
        <div className="flex items-center gap-3">
          <code className="text-2xl font-black tracking-[0.3em] text-sky-700">{group.joinCode}</code>
          <button
            onClick={handleCopyCode}
            className="p-2 rounded-lg hover:bg-sky-100 text-sky-500 transition-colors"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </motion.div>

      {/* Members */}
      <div className="mb-6">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
          {t('members')} ({group.memberCount})
        </h2>
        <div className="flex flex-col gap-2">
          {group.members.map(member => (
            <div
              key={member.userId}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 ${
                member.userId === userId ? 'border-sky-200 bg-sky-50' : 'border-gray-100 bg-white'
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {(member.displayName || member.username).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">
                  {member.displayName || member.username}
                  {member.userId === userId && <span className="text-xs ml-1 text-sky-500">({t('you')})</span>}
                </p>
                <p className="text-xs text-gray-400 capitalize">{member.role}</p>
              </div>
              {isOwnerOrAdmin && member.userId !== userId && member.role !== 'owner' && (
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Wordlists */}
      <div className="mb-6">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
          {t('wordlists')} ({group.wordlists.length})
        </h2>
        {group.wordlists.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">{t('noWordlists')}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {group.wordlists.map(wl => (
              <div key={wl.wordlistId} className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 bg-white">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <BookOpen size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{wl.name}</p>
                  <p className="text-xs text-gray-400">{wl.wordCount} {t('words')}</p>
                </div>
                {isOwnerOrAdmin && (
                  <button
                    onClick={() => handleUnassignWordlist(wl.wordlistId)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      {myMember?.role === 'owner' && (
        <div className="border-2 border-red-100 rounded-2xl p-4">
          <h3 className="text-xs font-black text-red-400 uppercase tracking-widest mb-3">{t('dangerZone')}</h3>
          <button
            onClick={handleDeleteGroup}
            className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
          >
            {t('deleteGroup')}
          </button>
        </div>
      )}
    </div>
  );
}
