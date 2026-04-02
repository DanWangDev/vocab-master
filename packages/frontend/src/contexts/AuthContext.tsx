import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import ApiService from '../services/ApiService';
import type { User, UserSettings, UserStats } from '../services/ApiService';
import { StorageService } from '../services/StorageService';
import { startOidcLogin, startOidcLogout } from '../services/api/oidcHelpers';

// Types
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User };

interface AuthContextType {
  state: AuthState;
  login: (options?: { prompt?: string }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  migrateLocalData: () => Promise<void>;
  updateProfile: (data: { username?: string; displayName?: string }) => Promise<void>;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys for localStorage migration tracking
const MIGRATION_DONE_KEY = 'vocab_master_migration_done';

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (ApiService.hasTokens()) {
        try {
          const user = await ApiService.getCurrentUser();
          if (user) {
            dispatch({ type: 'AUTH_SUCCESS', payload: user });
            return;
          }
        } catch {
          // Token invalid, clear it
          ApiService.clearTokens();
        }
      }
      dispatch({ type: 'LOGOUT' });
    };

    checkAuth();
  }, []);

  const login = async (options?: { prompt?: string }) => {
    await startOidcLogin(options);
  };

  const logout = () => {
    ApiService.clearTokens();
    dispatch({ type: 'LOGOUT' });
    startOidcLogout();
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateProfile = async (data: { username?: string; displayName?: string }) => {
    const response = await ApiService.updateProfile(data);
    dispatch({ type: 'UPDATE_USER', payload: response.user });
  };

  // Migrate localStorage data to the backend
  const migrateLocalData = async () => {
    try {
      // Get existing localStorage data
      const localSettings = StorageService.getSettings();
      const localStats = StorageService.getStats();

      // Check if there's any meaningful data to migrate
      const hasData =
        localStats.totalWordsStudied > 0 ||
        localStats.quizzesTaken > 0 ||
        localStats.challengesCompleted > 0;

      if (hasData) {
        // Import the data to the backend
        await ApiService.importData({
          settings: localSettings as UserSettings,
          stats: localStats as UserStats,
        });
      }

      // Mark migration as done
      localStorage.setItem(MIGRATION_DONE_KEY, 'true');
    } catch (error) {
      console.error('Failed to migrate local data:', error);
      // Don't throw - migration failure shouldn't block the user
    }
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        logout,
        clearError,
        migrateLocalData,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
