import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ApiService } from '../services/ApiService';
import type { User } from '../services/ApiService';

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
  login: (username: string, password: string) => Promise<void>;
  googleLogin: (idToken: string, username?: string) => Promise<void>;
  registerStudent: (username: string, password: string, displayName?: string) => Promise<void>;
  registerParent: (username: string, password: string, email: string, displayName?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateProfile: (data: { username?: string; displayName?: string }) => Promise<void>;
  clearNewGoogleUser: () => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isNewGoogleUser: false,
};

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const checkAuth = async () => {
      await ApiService.init();
      if (ApiService.hasTokens()) {
        try {
          const user = await ApiService.getCurrentUser();
          if (user) {
            dispatch({ type: 'AUTH_SUCCESS', payload: user });
            return;
          }
        } catch {
          await ApiService.clearTokens();
        }
      }
      dispatch({ type: 'LOGOUT' });
    };

    checkAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await ApiService.login(username, password);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  }, []);

  const googleLogin = useCallback(
    async (token: string, username?: string) => {
      dispatch({ type: 'AUTH_START' });
      try {
        const response = await ApiService.googleAuth(token, 'id_token', username);
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
    },
    []
  );

  const registerStudent = useCallback(
    async (username: string, password: string, displayName?: string) => {
      dispatch({ type: 'AUTH_START' });
      try {
        const response = await ApiService.registerStudent(username, password, displayName);
        dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
      } catch (error) {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: error instanceof Error ? error.message : 'Registration failed',
        });
        throw error;
      }
    },
    []
  );

  const registerParent = useCallback(
    async (username: string, password: string, email: string, displayName?: string) => {
      dispatch({ type: 'AUTH_START' });
      try {
        const response = await ApiService.registerParent(username, password, email, displayName);
        dispatch({ type: 'AUTH_SUCCESS', payload: response.user });
      } catch (error) {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: error instanceof Error ? error.message : 'Registration failed',
        });
        throw error;
      }
    },
    []
  );

  const forgotPassword = useCallback(async (email: string) => {
    dispatch({ type: 'AUTH_START' });
    try {
      await ApiService.forgotPassword(email);
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Password reset request failed',
      });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    // Unregister push token before clearing auth
    try {
      await ApiService.unregisterPushToken();
    } catch {
      // Best-effort unregister
    }
    await ApiService.logout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateProfile = useCallback(
    async (data: { username?: string; displayName?: string }) => {
      const response = await ApiService.updateProfile(data);
      dispatch({ type: 'UPDATE_USER', payload: response.user });
    },
    []
  );

  const clearNewGoogleUser = useCallback(() => {
    dispatch({ type: 'SET_NEW_GOOGLE_USER', payload: false });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        googleLogin,
        registerStudent,
        registerParent,
        forgotPassword,
        logout,
        clearError,
        updateProfile,
        clearNewGoogleUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
