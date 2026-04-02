import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BookOpen, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { wasAutoLoginAttempted, markAutoLoginAttempted } from '../../services/api/oidcHelpers';

export function AuthPage() {
  const { t } = useTranslation('auth');
  const { state, login } = useAuth();
  const navigate = useNavigate();

  const autoLoginStarted = useRef(false);

  // Redirect after successful authentication
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      const role = state.user.role;
      switch (role) {
        case 'parent':
          navigate('/parent', { replace: true });
          break;
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
      }
    }
  }, [state.isAuthenticated, state.user, navigate]);

  // Auto-start OIDC flow for users arriving from the hub without a local session.
  // The circuit breaker (sessionStorage flag) prevents infinite redirects when:
  //   - the hub has no active session (user not logged in)
  //   - the user explicitly logged out (flag set during logout)
  useEffect(() => {
    if (autoLoginStarted.current) return;
    if (state.isLoading || state.isAuthenticated || state.error) return;
    if (wasAutoLoginAttempted()) return;

    autoLoginStarted.current = true;
    markAutoLoginAttempted();
    // Use prompt=none for silent auth: if the hub has an active session the user
    // is transparently authenticated; if not, the hub returns login_required and
    // the user can click the manual login button.
    login({ prompt: 'none' }).catch(() => {});
    // login is a stable function created in AuthProvider; omitting it from deps
    // avoids re-firing the effect on every render since it is not wrapped in useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isLoading, state.isAuthenticated, state.error]);

  const handleLogin = async () => {
    await login();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4 background-pattern relative">
      {/* Language switcher for unauthenticated users */}
      <div className="absolute top-4 right-4 z-10 text-white">
        <LanguageSwitcher compact />
      </div>

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
          <p className="text-indigo-100 font-medium text-lg">
            {t('subtitle.login')}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/95 backdrop-blur-xl border-2 border-white/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>

          <div className="relative z-10">
            {state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {state.error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={state.isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={22} />
              Sign in with 11+ Hub
            </button>

            <p className="text-center text-gray-400 text-xs mt-6">
              You'll be redirected to the 11+ Hub to sign in
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-indigo-100 text-sm mt-8 font-medium opacity-80">
          {t('footer')}
        </p>
      </motion.div>
    </div>
  );
}

export default AuthPage;
