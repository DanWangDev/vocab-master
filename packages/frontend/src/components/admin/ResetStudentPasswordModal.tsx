import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, KeyRound, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../common';
import ApiService from '../../services/ApiService';

interface ResetStudentPasswordModalProps {
  userId: number;
  userName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ResetStudentPasswordModal({
  userId,
  userName,
  onClose,
  onSuccess
}: ResetStudentPasswordModalProps) {
  const { t } = useTranslation('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 6) {
      setError(t('validation.passwordMin'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('validation.passwordsNoMatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await ApiService.resetUserPassword(userId, password);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{t('resetPassword')}</h3>
              <p className="text-sm text-gray-500">{t('resetPasswordFor', { name: userName })}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              {t('resetPasswordWarning')}
            </p>
          </div>

          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.newPassword')}
            </label>
            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
                placeholder={t('placeholder.newPassword')}
                disabled={isSubmitting}
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">{t('hint.minPassword')}</p>
          </div>

          <div>
            <label htmlFor="reset-confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('form.confirmPassword')}
            </label>
            <input
              id="reset-confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder={t('placeholder.confirmPassword')}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !password.trim() || !confirmPassword.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('resetting')}
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  {t('resetPassword')}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default ResetStudentPasswordModal;
