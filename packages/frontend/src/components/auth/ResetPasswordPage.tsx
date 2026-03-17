import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BookOpen, Eye, EyeOff, Loader2, CheckCircle, XCircle, KeyRound } from 'lucide-react';
import ApiService from '../../services/ApiService';

export function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidToken(false);
        setIsValidating(false);
        return;
      }

      try {
        const result = await ApiService.validateResetToken(token);
        setIsValidToken(result.valid);
      } catch {
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

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
    if (!token) {
      setError(t('validation.invalidToken'));
      return;
    }

    setIsSubmitting(true);
    try {
      await ApiService.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('passwordResetFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 background-pattern">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <Loader2 size={48} className="animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg font-medium">{t('validatingLink')}</p>
        </motion.div>
      </div>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 background-pattern">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/95 backdrop-blur-xl border-2 border-white/50 rounded-3xl p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{t('invalidOrExpiredLink')}</h2>
            <p className="text-gray-600 mb-6">
              {t('invalidOrExpiredDesc')}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
            >
              {t('backToSignInButton')}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 background-pattern">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/95 backdrop-blur-xl border-2 border-white/50 rounded-3xl p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{t('passwordResetComplete')}</h2>
            <p className="text-gray-600 mb-6">
              {t('passwordResetSuccess')}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
            >
              {t('signIn')}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 background-pattern">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl mb-4 shadow-xl rotate-3"
          >
            <BookOpen size={40} className="text-indigo-600 drop-shadow-sm" strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-3xl font-black text-white mb-2 drop-shadow-md tracking-tight">
            {t('appName')}
          </h1>
        </div>

        {/* Reset Form Card */}
        <div className="bg-white/95 backdrop-blur-xl border-2 border-white/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl mb-3">
                <KeyRound className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">{t('resetYourPassword')}</h2>
              <p className="text-sm text-gray-500">{t('resetYourPasswordDesc')}</p>
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('form.newPassword')}
              </label>
              <div className="relative">
                <input
                  id="new-password"
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
              <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('form.confirmNewPassword')}
              </label>
              <input
                id="confirm-new-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder={t('placeholder.confirmNewPassword')}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !password.trim() || !confirmPassword.trim()}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {t('resetting')}
                </>
              ) : (
                <>
                  <KeyRound size={20} />
                  {t('resetPassword')}
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default ResetPasswordPage;
