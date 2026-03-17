import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, UserPlus, Loader2, ArrowLeft, Users, Mail } from 'lucide-react';
import { TurnstileWidget, isTurnstileEnabled } from './TurnstileWidget';

interface ParentRegisterFormProps {
  onSubmit: (username: string, password: string, email: string, displayName?: string, turnstileToken?: string) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export function ParentRegisterForm({ onSubmit, onBack, isLoading, error }: ParentRegisterFormProps) {
  const { t } = useTranslation('auth');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();

  const validate = (): boolean => {
    if (username.length < 3) {
      setValidationError(t('validation.usernameMin'));
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setValidationError(t('validation.usernameChars'));
      return false;
    }
    if (!email.trim()) {
      setValidationError(t('validation.emailRequired'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError(t('validation.emailInvalid'));
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
    await onSubmit(username.trim(), password, email.trim(), displayName.trim() || undefined, turnstileToken);
  };

  const displayedError = validationError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-3">
          <Users className="w-6 h-6 text-purple-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">{t('parentAccount')}</h2>
        <p className="text-sm text-gray-500">{t('parentAccountDesc')}</p>
      </div>

      <div>
        <label htmlFor="parent-username" className="block text-sm font-medium text-gray-700 mb-2">
          {t('form.username')}
        </label>
        <input
          id="parent-username"
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setValidationError(null);
          }}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder={t('placeholder.chooseUsername')}
          disabled={isLoading}
          autoComplete="username"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="parent-email" className="block text-sm font-medium text-gray-700 mb-2">
          <span className="flex items-center gap-1">
            <Mail size={14} />
            {t('form.emailAddress')}
          </span>
        </label>
        <input
          id="parent-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setValidationError(null);
          }}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder={t('placeholder.email')}
          disabled={isLoading}
          autoComplete="email"
        />
        <p className="mt-1 text-xs text-gray-500">{t('hint.emailRecovery')}</p>
      </div>

      <div>
        <label htmlFor="parent-display-name" className="block text-sm font-medium text-gray-700 mb-2">
          {t('form.displayName')} <span className="text-gray-400">{t('form.optional')}</span>
        </label>
        <input
          id="parent-display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder={t('placeholder.parentName')}
          disabled={isLoading}
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="parent-password" className="block text-sm font-medium text-gray-700 mb-2">
          {t('form.password')}
        </label>
        <div className="relative">
          <input
            id="parent-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setValidationError(null);
            }}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-12"
            placeholder={t('placeholder.createPassword')}
            disabled={isLoading}
            autoComplete="new-password"
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
        <label htmlFor="parent-confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
          {t('form.confirmPassword')}
        </label>
        <input
          id="parent-confirm-password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setValidationError(null);
          }}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder={t('placeholder.confirmPassword')}
          disabled={isLoading}
          autoComplete="new-password"
        />
      </div>

      <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(undefined)} />

      {displayedError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {displayedError}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || (isTurnstileEnabled && !turnstileToken)}
        className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
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

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
          disabled={isLoading}
        >
          <ArrowLeft size={18} />
          {t('back')}
        </button>
      </div>
    </form>
  );
}

export default ParentRegisterForm;
