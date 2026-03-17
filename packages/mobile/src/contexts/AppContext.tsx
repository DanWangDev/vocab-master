import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import i18n from '../i18n';
import type { UserSettings, UserStats, VocabularyWord, Wordlist, WordlistWord } from '@vocab-master/shared';
import { StorageService } from '../services/StorageService';
import { ApiService } from '../services/ApiService';
import { DatabaseService } from '../services/DatabaseService';
import { OfflineSyncService } from '../services/OfflineSyncService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

type AppAction =
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'UPDATE_STATS'; payload: Partial<UserStats> }
  | { type: 'LOAD_USER_DATA'; payload: { settings: UserSettings; stats: UserStats } }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SET_ACTIVE_WORDLIST'; payload: Wordlist | null };

interface AppState {
  settings: UserSettings;
  stats: UserStats;
  isSyncing: boolean;
  activeWordlist: Wordlist | null;
}

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  autoAdvance: false,
  language: 'en',
};

const DEFAULT_STATS: UserStats = {
  totalWordsStudied: 0,
  quizzesTaken: 0,
  challengesCompleted: 0,
  bestChallengeScore: 0,
  lastStudyDate: null,
};

const initialState: AppState = {
  settings: DEFAULT_SETTINGS,
  stats: DEFAULT_STATS,
  isSyncing: false,
  activeWordlist: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UPDATE_STATS':
      return { ...state, stats: { ...state.stats, ...action.payload } };
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
    default:
      return state;
  }
}

function mapToVocabularyWord(w: WordlistWord): VocabularyWord {
  return {
    targetWord: w.targetWord,
    definition: w.definitions,
    synonyms: w.synonyms,
    exampleSentence: w.exampleSentences,
  };
}

const vocabularyCache = new Map<number, VocabularyWord[]>();

interface AppContextType {
  state: AppState;
  vocabulary: VocabularyWord[];
  vocabularyLoading: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  updateStats: (stats: Partial<UserStats>) => Promise<void>;
  loadUserData: () => Promise<void>;
  switchWordlist: (wordlistId: number) => Promise<void>;
  activeWordlist: Wordlist | null;
  isAuthenticated: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

interface AppProviderProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export function AppProvider({ children, isAuthenticated = false }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [vocabularyLoading, setVocabularyLoading] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const { isOnline } = useNetworkStatus();

  // Initialize database on mount
  useEffect(() => {
    DatabaseService.init().catch(() => {
      // Database init failed - app will work without offline cache
    });
  }, []);

  // Subscribe to sync queue count changes
  useEffect(() => {
    const unsubscribe = OfflineSyncService.subscribe((count) => {
      setPendingSyncCount(count);
    });

    OfflineSyncService.getPendingCount().then(setPendingSyncCount);

    return unsubscribe;
  }, []);

  // Process sync queue when coming back online
  useEffect(() => {
    if (isOnline && isAuthenticated) {
      OfflineSyncService.processQueue().catch(() => {
        // Sync failed - will retry next time
      });
    }
  }, [isOnline, isAuthenticated]);

  // Load local settings on mount
  useEffect(() => {
    const loadLocal = async () => {
      const [settings, stats] = await Promise.all([
        StorageService.getSettings(),
        StorageService.getStats(),
      ]);
      dispatch({ type: 'LOAD_USER_DATA', payload: { settings, stats } });
    };
    loadLocal();
  }, []);

  // Load vocabulary from API when authenticated, fall back to SQLite cache when offline
  useEffect(() => {
    let cancelled = false;

    async function loadVocabulary() {
      if (!isAuthenticated || !ApiService.hasTokens()) {
        if (!cancelled) {
          setVocabulary([]);
          setVocabularyLoading(false);
        }
        return;
      }

      try {
        const { wordlist, words } = await ApiService.getActiveWordlist();
        if (cancelled) return;

        const mapped = words.map(mapToVocabularyWord);
        vocabularyCache.set(wordlist.id, mapped);
        setVocabulary(mapped);
        setVocabularyLoading(false);
        dispatch({ type: 'SET_ACTIVE_WORDLIST', payload: wordlist });

        // Cache to SQLite for offline use
        DatabaseService.cacheWordlist(wordlist, words).catch(() => {
          // Cache write failed - not critical
        });
        return;
      } catch {
        // API failed - try offline cache
      }

      // Fall back to SQLite cache
      try {
        const cached = await DatabaseService.getAnyCachedWordlist();
        if (cached && !cancelled) {
          const mapped = cached.words.map(mapToVocabularyWord);
          vocabularyCache.set(cached.wordlist.id, mapped);
          setVocabulary(mapped);
          dispatch({ type: 'SET_ACTIVE_WORDLIST', payload: cached.wordlist });
        }
      } catch {
        // Cache read also failed
      }

      if (!cancelled) {
        setVocabularyLoading(false);
      }
    }

    loadVocabulary();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const loadUserData = useCallback(async () => {
    if (!isAuthenticated || !ApiService.hasTokens()) return;

    dispatch({ type: 'SET_SYNCING', payload: true });
    try {
      const [settings, stats] = await Promise.all([
        ApiService.getSettings(),
        ApiService.getStats(),
      ]);

      dispatch({ type: 'LOAD_USER_DATA', payload: { settings, stats } });

      if (settings.language && settings.language !== i18n.language) {
        i18n.changeLanguage(settings.language);
        await StorageService.setLanguage(settings.language);
      }

      await Promise.all([
        StorageService.saveSettings(settings),
        StorageService.saveStats(stats),
      ]);

      // Process any pending sync items
      await OfflineSyncService.processQueue();
    } catch {
      // Fall back to local data
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated, loadUserData]);

  const updateSettings = useCallback(
    async (settings: Partial<UserSettings>) => {
      if (settings.language && settings.language !== i18n.language) {
        i18n.changeLanguage(settings.language);
        await StorageService.setLanguage(settings.language);
      }

      const newSettings = { ...state.settings, ...settings };
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      await StorageService.saveSettings(newSettings);

      if (isAuthenticated && ApiService.hasTokens()) {
        try {
          await ApiService.updateSettings(settings);
        } catch {
          // Queue for later sync
          await OfflineSyncService.queueRequest(
            'update_settings',
            '/settings',
            'PUT',
            settings
          );
        }
      }
    },
    [isAuthenticated, state.settings]
  );

  const switchWordlist = useCallback(
    async (wordlistId: number) => {
      if (!isAuthenticated || !ApiService.hasTokens()) return;

      setVocabularyLoading(true);
      try {
        await ApiService.setActiveWordlist(wordlistId);

        const cached = vocabularyCache.get(wordlistId);
        if (cached) {
          setVocabulary(cached);
        } else {
          const { words } = await ApiService.getWordlistWords(wordlistId);
          const mapped = words.map(mapToVocabularyWord);
          vocabularyCache.set(wordlistId, mapped);
          setVocabulary(mapped);

          // Also cache in SQLite
          const wordlist = await ApiService.getWordlist(wordlistId);
          DatabaseService.cacheWordlist(wordlist, words).catch(() => {});
        }

        const wordlist = await ApiService.getWordlist(wordlistId);
        dispatch({ type: 'SET_ACTIVE_WORDLIST', payload: wordlist });
      } catch {
        // Try SQLite cache
        const sqlCached = await DatabaseService.getCachedWordlist(wordlistId);
        if (sqlCached) {
          const mapped = sqlCached.words.map(mapToVocabularyWord);
          vocabularyCache.set(wordlistId, mapped);
          setVocabulary(mapped);
          dispatch({ type: 'SET_ACTIVE_WORDLIST', payload: sqlCached.wordlist });
        }
      } finally {
        setVocabularyLoading(false);
      }
    },
    [isAuthenticated]
  );

  const updateStats = useCallback(
    async (stats: Partial<UserStats>) => {
      const newStats = { ...state.stats, ...stats };
      dispatch({ type: 'UPDATE_STATS', payload: stats });
      await StorageService.saveStats(newStats);

      if (isAuthenticated && ApiService.hasTokens()) {
        try {
          await ApiService.updateStats(stats);
        } catch {
          await OfflineSyncService.queueRequest(
            'update_stats',
            '/stats',
            'PATCH',
            stats
          );
        }
      }
    },
    [isAuthenticated, state.stats]
  );

  const value: AppContextType = {
    state,
    vocabulary,
    vocabularyLoading,
    isOnline,
    pendingSyncCount,
    updateSettings,
    updateStats,
    loadUserData,
    switchWordlist,
    activeWordlist: state.activeWordlist,
    isAuthenticated,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
