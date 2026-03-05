import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { LoginForm } from './LoginForm';
import { RoleSelection } from './RoleSelection';
import { StudentRegisterForm } from './StudentRegisterForm';
import { ParentRegisterForm } from './ParentRegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

type AuthMode = 'login' | 'register-select-role' | 'register-student' | 'register-parent' | 'forgot-password';

interface LocationState {
  from?: {
    pathname: string;
  };
}

export function AuthPage() {
  const { t } = useTranslation('auth');
  const [mode, setMode] = useState<AuthMode>('login');
  const { state, login, googleLogin, registerStudent, registerParent, forgotPassword, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination from location state
  const locationState = location.state as LocationState | null;
  const from = locationState?.from?.pathname;

  // Redirect after successful authentication
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      // If there's a saved destination, go there
      if (from && from !== '/login') {
        navigate(from, { replace: true });
        return;
      }

      // Otherwise, redirect based on user role
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
  }, [state.isAuthenticated, state.user, from, navigate]);

  const handleLogin = async (username: string, password: string) => {
    await login(username, password);
  };

  const handleGoogleLogin = async (credential: string) => {
    try {
      await googleLogin(credential);
    } catch {
      // Error handled by context
    }
  };

  const handleRegisterStudent = async (username: string, password: string, displayName?: string) => {
    await registerStudent(username, password, displayName);
  };

  const handleRegisterParent = async (username: string, password: string, email: string, displayName?: string) => {
    await registerParent(username, password, email, displayName);
  };

  const handleForgotPassword = async (email: string) => {
    await forgotPassword(email);
  };

  const switchMode = (newMode: AuthMode) => {
    clearError();
    setMode(newMode);
  };

  // Get subtitle based on mode
  const getSubtitle = () => {
    switch (mode) {
      case 'login':
        return t('subtitle.login');
      case 'register-select-role':
        return t('subtitle.registerSelectRole');
      case 'register-student':
        return t('subtitle.registerStudent');
      case 'register-parent':
        return t('subtitle.registerParent');
      case 'forgot-password':
        return t('subtitle.forgotPassword');
      default:
        return '';
    }
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
            {getSubtitle()}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/95 backdrop-blur-xl border-2 border-white/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>

          <div className="relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {mode === 'login' && (
                  <LoginForm
                    onSubmit={handleLogin}
                    onGoogleLogin={GOOGLE_CLIENT_ID ? handleGoogleLogin : undefined}
                    onSwitchToRegister={() => switchMode('register-select-role')}
                    onForgotPassword={() => switchMode('forgot-password')}
                    isLoading={state.isLoading}
                    error={state.error}
                  />
                )}

                {mode === 'register-select-role' && (
                  <RoleSelection
                    onSelectStudent={() => switchMode('register-student')}
                    onSelectParent={() => switchMode('register-parent')}
                    onBack={() => switchMode('login')}
                  />
                )}

                {mode === 'register-student' && (
                  <StudentRegisterForm
                    onSubmit={handleRegisterStudent}
                    onBack={() => switchMode('register-select-role')}
                    isLoading={state.isLoading}
                    error={state.error}
                  />
                )}

                {mode === 'register-parent' && (
                  <ParentRegisterForm
                    onSubmit={handleRegisterParent}
                    onBack={() => switchMode('register-select-role')}
                    isLoading={state.isLoading}
                    error={state.error}
                  />
                )}

                {mode === 'forgot-password' && (
                  <ForgotPasswordForm
                    onSubmit={handleForgotPassword}
                    onBack={() => switchMode('login')}
                    isLoading={state.isLoading}
                    error={state.error}
                  />
                )}
              </motion.div>
            </AnimatePresence>
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
