import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import i18n from '../i18n';
import type { AppState, AppMode, UserSettings, UserStats, VocabularyWord, Wordlist, WordlistWord } from '../types';
import { StorageService } from '../services/StorageService';
import ApiService from '../services/ApiService';

// Actions
type AppAction =
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'UPDATE_STATS'; payload: Partial<UserStats> }
  | { type: 'LOAD_USER_DATA'; payload: { settings: UserSettings; stats: UserStats } }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_ACTIVE_WORDLIST'; payload: Wordlist | null }
  | { type: 'SET_VOCABULARY_LOADING'; payload: boolean };

// Extended state for sync status
interface ExtendedAppState extends Omit<AppState, 'currentMode'> {
  isSyncing: boolean;
  activeWordlist: Wordlist | null;
}

// Initial state
const initialState: ExtendedAppState = {
  settings: StorageService.getSettings(),
  stats: StorageService.getStats(),
  isSyncing: false,
  activeWordlist: null,
};

// Reducer
function appReducer(state: ExtendedAppState, action: AppAction): ExtendedAppState {
  switch (action.type) {
    case 'UPDATE_SETTINGS': {
      const newSettings = { ...state.settings, ...action.payload };
      // Always save to localStorage as fallback
      StorageService.saveSettings(newSettings);
      return { ...state, settings: newSettings };
    }

    case 'UPDATE_STATS': {
      const newStats = { ...state.stats, ...action.payload };
      // Always save to localStorage as fallback
      StorageService.saveStats(newStats);
      return { ...state, stats: newStats };
    }

    case 'LOAD_USER_DATA':
      return {
        ...state,
        settings: action.payload.settings,
        stats: action.payload.stats,
      };

    case 'SET_SYNCING':
      return { ...state, isSyncing: action.payload };

    case 'SET_ACTIVE_WORDLIST':
      return { ...state, activeWordlist: action.payload };

    case 'SET_VOCABULARY_LOADING':
      return state;

    default:
      return state;
  }
}

// Helper to derive currentMode from pathname
function deriveCurrentMode(pathname: string): AppMode {
  switch (pathname) {
    case '/study':
      return 'study';
    case '/quiz':
      return 'quiz';
    case '/challenge':
      return 'challenge';
    case '/parent':
      return 'parent';
    case '/admin':
      return 'admin';
    case '/login':
      return 'login';
    default:
      return 'dashboard';
  }
}

// Context type
interface AppContextType {
  state: ExtendedAppState & { currentMode: AppMode };
  dispatch: React.Dispatch<AppAction>;
  vocabulary: VocabularyWord[];
  vocabularyLoading: boolean;
  /** @deprecated Use useNavigate() from react-router-dom instead */
  setMode: (mode: AppMode) => void;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  updateStats: (stats: Partial<UserStats>) => Promise<void>;
  loadUserData: () => Promise<void>;
  switchWordlist: (wordlistId: number) => Promise<void>;
  activeWordlist: Wordlist | null;
  isAuthenticated: boolean;
}

// Create context
const AppContext = createContext<AppContextType | null>(null);

// Helper to map API WordlistWord to VocabularyWord
function mapToVocabularyWord(w: WordlistWord): VocabularyWord {
  return {
    targetWord: w.targetWord,
    definition: w.definitions,
    synonyms: w.synonyms,
    exampleSentence: w.exampleSentences,
  };
}

// Cache for vocabulary data keyed by wordlist ID (0 = fallback/unauthenticated)
const vocabularyCache = new Map<number, VocabularyWord[]>();

// Provider component
interface AppProviderProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export function AppProvider({ children, isAuthenticated = false }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [vocabularyLoading, setVocabularyLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Derive currentMode from location
  const currentMode = deriveCurrentMode(location.pathname);

  // Load vocabulary data - from API if authenticated, otherwise from public folder
  useEffect(() => {
    let cancelled = false;

    async function loadVocabulary() {
      // If authenticated, try to load from API
      if (isAuthenticated && ApiService.hasTokens()) {
        try {
          const { wordlist, words } = await ApiService.getActiveWordlist();
          if (cancelled) return;
          const mapped = words.map(mapToVocabularyWord);
          vocabularyCache.set(wordlist.id, mapped);
          setVocabulary(mapped);
          setVocabularyLoading(false);
          dispatch({ type: 'SET_ACTIVE_WORDLIST', payload: wordlist });
          return;
        } catch (error) {
          console.error('Failed to load active wordlist from API, falling back to words.json:', error);
        }
      }

      // Fallback: load from public folder
      const cached = vocabularyCache.get(0);
      if (cached) {
        if (!cancelled) {
          setVocabulary(cached);
          setVocabularyLoading(false);
        }
        return;
      }

      try {
        const res = await fetch('/words.json');
        const data: VocabularyWord[] = await res.json();
        if (cancelled) return;
        vocabularyCache.set(0, data);
        setVocabulary(data);
        setVocabularyLoading(false);
      } catch (err) {
        console.error('Failed to load vocabulary:', err);
        if (!cancelled) {
          setVocabularyLoading(false);
        }
      }
    }

    loadVocabulary();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Load user data from API when authenticated
  const loadUserData = useCallback(async () => {
    if (!isAuthenticated || !ApiService.hasTokens()) {
      return;
    }

    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      const [settings, stats] = await Promise.all([
        ApiService.getSettings(),
        ApiService.getStats(),
      ]);

      dispatch({
        type: 'LOAD_USER_DATA',
        payload: { settings, stats },
      });

      // Sync i18n language with user settings
      if (settings.language && settings.language !== i18n.language) {
        i18n.changeLanguage(settings.language);
        localStorage.setItem('vocab_master_language', settings.language);
      }

      // Also update localStorage as cache
      StorageService.saveSettings(settings);
      StorageService.saveStats(stats);
    } catch (error) {
      console.error('Failed to load user data from API:', error);
      // Fall back to localStorage data (already in state)
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [isAuthenticated]);

  // Load user data when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated, loadUserData]);

  // Helper function to set mode (deprecated - uses navigate internally)
  const setMode = useCallback((mode: AppMode) => {
    const routes: Record<AppMode, string> = {
      dashboard: '/',
      study: '/study',
      quiz: '/quiz',
      challenge: '/challenge',
      parent: '/parent',
      admin: '/admin',
      login: '/login',
    };
    navigate(routes[mode]);
  }, [navigate]);

  // Update settings with API sync
  const updateSettings = useCallback(async (settings: Partial<UserSettings>) => {
    // Sync language change to i18n
    if (settings.language && settings.language !== i18n.language) {
      i18n.changeLanguage(settings.language);
      localStorage.setItem('vocab_master_language', settings.language);
    }

    // Optimistically update local state
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });

    // Sync to API if authenticated
    if (isAuthenticated && ApiService.hasTokens()) {
      try {
        await ApiService.updateSettings(settings);
      } catch (error) {
        console.error('Failed to sync settings to API:', error);
        // Local state is already updated, so we don't need to do anything
      }
    }
  }, [isAuthenticated]);

  // Switch active wordlist
  const switchWordlist = useCallback(async (wordlistId: number) => {
    if (!isAuthenticated || !ApiService.hasTokens()) return;

    setVocabularyLoading(true);
    try {
      await ApiService.setActiveWordlist(wordlistId);

      // Check cache first
      const cached = vocabularyCache.get(wordlistId);
      if (cached) {
        setVocabulary(cached);
      } else {
        const { words } = await ApiService.getWordlistWords(wordlistId);
        const mapped = words.map(mapToVocabularyWord);
        vocabularyCache.set(wordlistId, mapped);
        setVocabulary(mapped);
      }

      const wordlist = await ApiService.getWordlist(wordlistId);
      dispatch({ type: 'SET_ACTIVE_WORDLIST', payload: wordlist });
    } catch (error) {
      console.error('Failed to switch wordlist:', error);
      throw error;
    } finally {
      setVocabularyLoading(false);
    }
  }, [isAuthenticated]);

  // Update stats with API sync
  const updateStats = useCallback(async (stats: Partial<UserStats>) => {
    // Optimistically update local state
    dispatch({ type: 'UPDATE_STATS', payload: stats });

    // Sync to API if authenticated
    if (isAuthenticated && ApiService.hasTokens()) {
      try {
        await ApiService.updateStats(stats);
      } catch (error) {
        console.error('Failed to sync stats to API:', error);
        // Local state is already updated, so we don't need to do anything
      }
    }
  }, [isAuthenticated]);

  // Combine state with derived currentMode
  const stateWithMode = {
    ...state,
    currentMode,
  };

  const value: AppContextType = {
    state: stateWithMode,
    dispatch,
    vocabulary,
    vocabularyLoading,
    setMode,
    updateSettings,
    updateStats,
    loadUserData,
    switchWordlist,
    activeWordlist: state.activeWordlist,
    isAuthenticated,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook to use context
// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
