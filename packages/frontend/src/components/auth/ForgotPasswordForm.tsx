import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export function ForgotPasswordForm({ onSubmit, onBack, isLoading, error }: ForgotPasswordFormProps) {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!email.trim()) {
      setValidationError(t('validation.emailRequired'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError(t('validation.emailInvalid'));
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(email.trim());
      setSubmitted(true);
    } catch {
      // Error is handled by parent
    }
  };

  const displayedError = validationError || error;

  // Success state
  if (submitted) {
    return (
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('checkYourEmail')}</h2>
          <p className="text-gray-600">
            {t('resetEmailSentPlain', { email })}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p>{t('checkSpam')}</p>
        </div>

        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
        >
          <ArrowLeft size={18} />
          {t('backToSignIn')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl mb-3">
          <Mail className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">{t('forgotPasswordTitle')}</h2>
        <p className="text-sm text-gray-500">{t('forgotPasswordDesc')}</p>
      </div>

      <div>
        <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">
          {t('form.emailAddress')}
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setValidationError(null);
          }}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          placeholder={t('placeholder.email')}
          disabled={isLoading}
          autoComplete="email"
          autoFocus
        />
      </div>

      {displayedError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {displayedError}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !email.trim()}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            {t('sending')}
          </>
        ) : (
          <>
            <Mail size={20} />
            {t('sendResetLink')}
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
          {t('backToSignIn')}
        </button>
      </div>

      <div className="text-center text-xs text-gray-500 pt-2">
        <p>{t('parentOnlyRecovery')}</p>
        <p>{t('studentAskParent')}</p>
      </div>
    </form>
  );
}

export default ForgotPasswordForm;
