import { createContext } from 'react';
import type { LevelInfo, XpResult } from '../services/api/gamificationApi';

export interface XpPopupItem {
  id: string;
  amount: number;
}

export interface XpContextType {
  levelInfo: LevelInfo | null;
  xpPopups: XpPopupItem[];
  levelUpEvent: { level: number; title: string } | null;
  handleXpResult: (xp: XpResult) => void;
  dismissLevelUp: () => void;
  dismissPopup: (id: string) => void;
  refreshLevelInfo: () => void;
}

export const XpContext = createContext<XpContextType | null>(null);
