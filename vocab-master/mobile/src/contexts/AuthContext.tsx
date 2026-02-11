import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ApiService } from '../services/ApiService';
import type { User } from '../services/ApiService';

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
  | { type: 'CLEAR_ERROR' };

interface AuthContextType {
  state: AuthState;
  login: (username: string, password: string) => Promise<void>;
  registerStudent: (username: string, password: string, displayName?: string) => Promise<void>;
  registerParent: (username: string, password: string, email: string, displayName?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
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
    await ApiService.logout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        registerStudent,
        registerParent,
        forgotPassword,
        logout,
        clearError,
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
