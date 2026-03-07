import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import ApiService from '../services/ApiService';
import type { User, UserSettings, UserStats } from '../services/ApiService';
import { StorageService } from '../services/StorageService';

// Types
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isNewGoogleUser: boolean;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_NEW_GOOGLE_USER'; payload: boolean }
  | { type: 'UPDATE_USER'; payload: User };

interface AuthContextType {
  state: AuthState;
  login: (username: string, password: string, turnstileToken?: string) => Promise<void>;
  googleLogin: (idToken: string, username?: string) => Promise<void>;
  register: (username: string, password: string, displayName?: string, turnstileToken?: string) => Promise<void>;
  registerStudent: (username: string, password: string, displayName?: string, turnstileToken?: string) => Promise<void>;
  registerParent: (username: string, password: string, email: string, displayName?: string, turnstileToken?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  migrateLocalData: () => Promise<void>;
  updateProfile: (data: { username?: string; displayName?: string }) => Promise<void>;
  clearNewGoogleUser: () => void;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isNewGoogleUser: false,
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
    case 'SET_NEW_GOOGLE_USER':
      return { ...state, isNewGoogleUser: action.payload };
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

  const login = async (username: string, password: string, turnstileToken?: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await ApiService.login(username, password, turnstileToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });

      // Check if we should migrate local data
      const migrationDone = localStorage.getItem(MIGRATION_DONE_KEY);
      if (!migrationDone) {
        await migrateLocalData();
      }
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  };

  const googleLogin = async (accessToken: string, username?: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await ApiService.googleAuth(accessToken, 'access_token', username);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
      if (response.isNewUser) {
        dispatch({ type: 'SET_NEW_GOOGLE_USER', payload: true });
      }
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Google login failed',
      });
      throw error;
    }
  };

  const register = async (username: string, password: string, displayName?: string, turnstileToken?: string) => {
    return registerStudent(username, password, displayName, turnstileToken);
  };

  const registerStudent = async (username: string, password: string, displayName?: string, turnstileToken?: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await ApiService.registerStudent(username, password, displayName, turnstileToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });

      // Migrate local data after registration
      await migrateLocalData();
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Registration failed',
      });
      throw error;
    }
  };

  const registerParent = async (username: string, password: string, email: string, displayName?: string, turnstileToken?: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await ApiService.registerParent(username, password, email, displayName, turnstileToken);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });

      // Migrate local data after registration
      await migrateLocalData();
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Registration failed',
      });
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      await ApiService.forgotPassword(email);
      dispatch({ type: 'LOGOUT' }); // Reset loading state without error
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Password reset request failed',
      });
      throw error;
    }
  };

  const resetPassword = async (token: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      await ApiService.resetPassword(token, password);
      dispatch({ type: 'LOGOUT' }); // Reset loading state
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Password reset failed',
      });
      throw error;
    }
  };

  const logout = async () => {
    await ApiService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateProfile = async (data: { username?: string; displayName?: string }) => {
    try {
      const response = await ApiService.updateProfile(data);
      dispatch({ type: 'UPDATE_USER', payload: response.user });
    } catch (error) {
      throw error;
    }
  };

  const clearNewGoogleUser = () => {
    dispatch({ type: 'SET_NEW_GOOGLE_USER', payload: false });
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
        googleLogin,
        register,
        registerStudent,
        registerParent,
        forgotPassword,
        resetPassword,
        logout,
        clearError,
        migrateLocalData,
        updateProfile,
        clearNewGoogleUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
