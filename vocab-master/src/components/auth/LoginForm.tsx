import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, LogIn, Loader2, KeyRound } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface LoginFormProps {
  onSubmit: (username: string, password: string) => Promise<void>;
  onGoogleLogin?: (credential: string) => void;
  onSwitchToRegister: () => void;
  onForgotPassword?: () => void;
  isLoading: boolean;
  error: string | null;
}

export function LoginForm({ onSubmit, onGoogleLogin, onSwitchToRegister, onForgotPassword, isLoading, error }: LoginFormProps) {
  const { t } = useTranslation('auth');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    await onSubmit(username.trim(), password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-2">
          {t('form.username')}
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder={t('placeholder.username')}
          disabled={isLoading}
          autoComplete="username"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
          {t('form.password')}
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
            placeholder={t('placeholder.password')}
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !username.trim() || !password.trim()}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            {t('signingIn')}
          </>
        ) : (
          <>
            <LogIn size={20} />
            {t('signIn')}
          </>
        )}
      </button>

      {onGoogleLogin && (
        <>
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-gray-600/30" />
            <span className="text-gray-400 text-sm">{t('or', 'or')}</span>
            <div className="flex-1 h-px bg-gray-600/30" />
          </div>

          <GoogleSignInButton
            onSuccess={onGoogleLogin}
          />
        </>
      )}

      <div className="flex flex-col items-center gap-3">
        <div>
          <span className="text-gray-400">{t('noAccount')} </span>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            disabled={isLoading}
          >
            {t('createOne')}
          </button>
        </div>
        {onForgotPassword && (
          <button
            type="button"
            onClick={onForgotPassword}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-300 text-sm transition-colors"
            disabled={isLoading}
          >
            <KeyRound size={14} />
            {t('forgotPassword')}
          </button>
        )}
      </div>
    </form>
  );
}

export default LoginForm;
