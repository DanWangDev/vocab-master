import { useCallback } from 'react';
import { audioManager } from '../services/AudioManager';
import { useApp } from '../contexts/AppContext';

export function useAudio() {
  const { state } = useApp();
  const soundEnabled = state.settings.soundEnabled;

  const play = useCallback(
    (sound: 'success' | 'error' | 'click' | 'flip' | 'warning' | 'complete') => {
      if (!soundEnabled) return;
      audioManager.play(sound);
    },
    [soundEnabled]
  );

  const playSuccess = useCallback(() => play('success'), [play]);
  const playError = useCallback(() => play('error'), [play]);
  const playClick = useCallback(() => play('click'), [play]);
  const playFlip = useCallback(() => play('flip'), [play]);
  const playWarning = useCallback(() => play('warning'), [play]);
  const playComplete = useCallback(() => play('complete'), [play]);

  return {
    play,
    playSuccess,
    playError,
    playClick,
    playFlip,
    playWarning,
    playComplete,
  };
}
