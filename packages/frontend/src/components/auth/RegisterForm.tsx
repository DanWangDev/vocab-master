import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';

interface RegisterFormProps {
  onSubmit: (username: string, password: string, displayName?: string) => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading: boolean;
  error: string | null;
}

export function RegisterForm({ onSubmit, onSwitchToLogin, isLoading, error }: RegisterFormProps) {
  const { t } = useTranslation('auth');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (username.length < 3) {
      setValidationError(t('validation.usernameMin'));
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setValidationError(t('validation.usernameChars'));
      return false;
    }
    if (password.length < 6) {
      setValidationError(t('validation.passwordMin'));
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError(t('validation.passwordsNoMatch'));
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(username.trim(), password, displayName.trim() || undefined);
  };

  const displayedError = validationError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="reg-username" className="block text-sm font-medium text-gray-200 mb-2">
          {t('form.username')}
        </label>
        <input
          id="reg-username"
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setValidationError(null);
          }}
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder={t('placeholder.chooseUsername')}
          disabled={isLoading}
          autoComplete="username"
          autoFocus
        />
        <p className="mt-1 text-xs text-gray-400">
          {t('hint.usernameChars')}
        </p>
      </div>

      <div>
        <label htmlFor="display-name" className="block text-sm font-medium text-gray-200 mb-2">
          {t('form.displayName')} <span className="text-gray-500">{t('form.optional')}</span>
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder={t('placeholder.displayName')}
          disabled={isLoading}
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium text-gray-200 mb-2">
          {t('form.password')}
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setValidationError(null);
            }}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
            placeholder={t('placeholder.createPassword')}
            disabled={isLoading}
            autoComplete="new-password"
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
        <p className="mt-1 text-xs text-gray-400">{t('hint.minPassword')}</p>
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-200 mb-2">
          {t('form.confirmPassword')}
        </label>
        <input
          id="confirm-password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setValidationError(null);
          }}
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder={t('placeholder.confirmPassword')}
          disabled={isLoading}
          autoComplete="new-password"
        />
      </div>

      {displayedError && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {displayedError}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !username.trim() || !password.trim() || !confirmPassword.trim()}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            {t('creatingAccount')}
          </>
        ) : (
          <>
            <UserPlus size={20} />
            {t('createAccount')}
          </>
        )}
      </button>

      <div className="text-center">
        <span className="text-gray-400">{t('alreadyHaveAccount')} </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          disabled={isLoading}
        >
          {t('signIn')}
        </button>
      </div>
    </form>
  );
}

export default RegisterForm;
