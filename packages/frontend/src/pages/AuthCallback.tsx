import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { exchangeCodeForTokens, storeOidcTokens, clearAutoLoginAttempted } from '../services/api/oidcHelpers';

/**
 * OIDC callback handler.
 *
 * Handles the redirect from the hub after authentication:
 * 1. Extracts code and state from URL params
 * 2. Exchanges code for tokens using PKCE
 * 3. Stores tokens in localStorage
 * 4. Redirects to / with full page reload (so AuthProvider re-initializes)
 *
 * Uses useRef to prevent double execution in React StrictMode (gotcha #5).
 * Uses window.location.href instead of navigate() (gotcha #6).
 */
export function AuthCallback() {
  const exchangeStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorParam = params.get('error');

      if (errorParam) {
        setError(params.get('error_description') || errorParam);
        return;
      }

      if (!code || !state) {
        setError('Missing authorization code or state parameter');
        return;
      }

      try {
        const tokens = await exchangeCodeForTokens(code, state);
        storeOidcTokens(tokens);
        clearAutoLoginAttempted();
        // Full page reload so AuthProvider picks up the new token
        window.location.href = '/';
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    }

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Authentication Failed</div>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-indigo-500 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
