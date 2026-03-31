import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, User, Loader2, CheckCircle } from 'lucide-react';

interface CompleteProfileModalProps {
  mode: 'complete' | 'edit';
  currentUsername: string;
  currentDisplayName: string | null;
  onSave: (data: { username?: string; displayName?: string }) => Promise<void>;
  onClose: () => void;
}

export function CompleteProfileModal({
  mode,
  currentUsername,
  currentDisplayName,
  onSave,
  onClose,
}: CompleteProfileModalProps) {
  const { t } = useTranslation('auth');
  const { t: tParent } = useTranslation('parent');
  const [username, setUsername] = useState(currentUsername);
  const [displayName, setDisplayName] = useState(currentDisplayName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const usernameValid = /^[a-zA-Z0-9_-]{3,30}$/.test(username);
  const hasChanges = username !== currentUsername || displayName !== (currentDisplayName || '');
  const isValid = usernameValid && displayName.length <= 50 && hasChanges;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const updates: { username?: string; displayName?: string } = {};
      if (username !== currentUsername) {
        updates.username = username;
      }
      if (displayName !== (currentDisplayName || '')) {
        updates.displayName = displayName || undefined;
      }

      if (Object.keys(updates).length > 0) {
        await onSave(updates);
      }
      setSuccess(true);
      setTimeout(onClose, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={mode === 'edit' ? onClose : undefined} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10"
      >
        {mode === 'edit' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {mode === 'complete' ? t('completeProfile.title') : tParent('editProfile')}
            </h3>
            <p className="text-sm text-gray-500">{t('completeProfile.subtitle')}</p>
          </div>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-8 text-green-600">
            <CheckCircle className="w-12 h-12 mb-3" />
            <p className="font-medium">{t('completeProfile.saved')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
                autoFocus
                autoComplete="off"
              />
              {username && !usernameValid && (
                <p className="mt-1 text-xs text-red-500">{t('hint.usernameChars')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.displayName')} <span className="text-gray-400">{t('form.optional')}</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={t('placeholder.displayName')}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              {mode === 'complete' && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  {t('completeProfile.skip')}
                </button>
              )}
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  {t('back')}
                </button>
              )}
              <button
                type="submit"
                disabled={!isValid || loading}
                className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : null}
                {t('completeProfile.save')}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
