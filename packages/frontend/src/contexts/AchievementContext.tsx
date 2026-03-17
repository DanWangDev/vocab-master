import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AchievementUnlockedToast } from '../components/achievements/AchievementUnlockedToast';
import type { NewlyEarnedAchievement } from '../services/api/achievementApi';

interface AchievementContextValue {
  showAchievements: (achievements: NewlyEarnedAchievement[]) => void;
}

const AchievementContext = createContext<AchievementContextValue | null>(null);

export function useAchievements() {
  const ctx = useContext(AchievementContext);
  if (!ctx) {
    throw new Error('useAchievements must be used within AchievementProvider');
  }
  return ctx;
}

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<NewlyEarnedAchievement[]>([]);
  const [current, setCurrent] = useState<NewlyEarnedAchievement | null>(null);

  const showAchievements = useCallback((achievements: NewlyEarnedAchievement[]) => {
    if (achievements.length === 0) return;
    setQueue(prev => [...prev, ...achievements]);
  }, []);

  const handleClose = useCallback(() => {
    setCurrent(null);
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [current, queue]);

  return (
    <AchievementContext.Provider value={{ showAchievements }}>
      {children}
      <AchievementUnlockedToast achievement={current} onClose={handleClose} />
    </AchievementContext.Provider>
  );
}
