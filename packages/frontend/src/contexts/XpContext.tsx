import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { gamificationApi, type LevelInfo, type XpResult } from '../services/api/gamificationApi';
import { useAuth } from './AuthContext';

interface XpPopupItem {
  id: string;
  amount: number;
}

interface XpContextType {
  levelInfo: LevelInfo | null;
  xpPopups: XpPopupItem[];
  levelUpEvent: { level: number; title: string } | null;
  handleXpResult: (xp: XpResult) => void;
  dismissLevelUp: () => void;
  dismissPopup: (id: string) => void;
  refreshLevelInfo: () => void;
}

const XpContext = createContext<XpContextType | null>(null);

export function XpProvider({ children }: { children: ReactNode }) {
  const { state: authState } = useAuth();
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [xpPopups, setXpPopups] = useState<XpPopupItem[]>([]);
  const [levelUpEvent, setLevelUpEvent] = useState<{ level: number; title: string } | null>(null);

  const refreshLevelInfo = useCallback(() => {
    if (authState.user?.role === 'student') {
      gamificationApi.getLevelInfo()
        .then(setLevelInfo)
        .catch(() => { /* silent */ });
    }
  }, [authState.user?.role]);

  useEffect(() => {
    refreshLevelInfo();
  }, [refreshLevelInfo]);

  const handleXpResult = useCallback((xp: XpResult) => {
    if (xp.earned > 0) {
      const id = `${Date.now()}-${Math.random()}`;
      setXpPopups(prev => [...prev.slice(-2), { id, amount: xp.earned }]);

      // Auto-dismiss after 2s
      setTimeout(() => {
        setXpPopups(prev => prev.filter(p => p.id !== id));
      }, 2000);
    }

    if (xp.leveledUp && xp.newLevel && xp.newTitle) {
      setLevelUpEvent({ level: xp.newLevel, title: xp.newTitle });
    }

    // Update level info
    setLevelInfo(prev => prev ? {
      ...prev,
      totalXp: xp.total,
      level: xp.level,
      xpInLevel: xp.total - prev.currentLevelXp,
    } : prev);
  }, []);

  const dismissLevelUp = useCallback(() => {
    setLevelUpEvent(null);
    refreshLevelInfo();
  }, [refreshLevelInfo]);

  const dismissPopup = useCallback((id: string) => {
    setXpPopups(prev => prev.filter(p => p.id !== id));
  }, []);

  return (
    <XpContext.Provider value={{ levelInfo, xpPopups, levelUpEvent, handleXpResult, dismissLevelUp, dismissPopup, refreshLevelInfo }}>
      {children}
    </XpContext.Provider>
  );
}

export function useXp() {
  const ctx = useContext(XpContext);
  if (!ctx) throw new Error('useXp must be used within XpProvider');
  return ctx;
}
