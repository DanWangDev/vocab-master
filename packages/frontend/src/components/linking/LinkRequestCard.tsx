import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, X, UserPlus, Loader2 } from 'lucide-react';
import type { LinkRequest } from '../../services/ApiService';

interface LinkRequestCardProps {
  request: LinkRequest;
  onAccept: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export function LinkRequestCard({ request, onAccept, onReject }: LinkRequestCardProps) {
  const { t } = useTranslation('linking');
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading('accept');
    setError(null);
    try {
      await onAccept(request.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept request');
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading('reject');
    setError(null);
    try {
      await onReject(request.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline request');
      setLoading(null);
    }
  };

  const parentName = request.parentDisplayName || request.parentUsername || 'Unknown Parent';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-white border-2 border-primary-200 rounded-xl p-4 shadow-clay-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
          <UserPlus size={20} className="text-primary-600" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900">{t('linkRequestFrom', { name: parentName })}</h4>
          <p className="text-sm text-gray-600 mt-0.5">
            {t('wantsToLink', { name: parentName })}
          </p>

          {request.message && (
            <p className="text-sm text-gray-500 italic mt-2 p-2 bg-gray-50 rounded-lg">
              "{request.message}"
            </p>
          )}

          <p className="text-xs text-gray-400 mt-2">
            {formatTimeAgo(request.createdAt)}
          </p>

          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAccept}
              disabled={loading !== null}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-study hover:bg-study/90 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading === 'accept' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {t('accept')}
            </button>
            <button
              onClick={handleReject}
              disabled={loading !== null}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading === 'reject' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <X size={16} />
              )}
              {t('decline')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default LinkRequestCard;
