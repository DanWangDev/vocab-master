import { useContext } from 'react';
import { XpContext } from '../contexts/xpContextDef';

export function useXp() {
  const ctx = useContext(XpContext);
  if (!ctx) throw new Error('useXp must be used within XpProvider');
  return ctx;
}
