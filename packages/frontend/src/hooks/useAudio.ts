import { useCallback } from 'react';
import { audioManager } from '../services/AudioManager';
import { useApp } from '../contexts/AppContext';

export function useAudio() {
  const { state, dispatch } = useApp();
  const { soundEnabled } = state.settings;

  const playSuccess = useCallback(() => {
    if (soundEnabled) audioManager.play('success');
  }, [soundEnabled]);

  const playError = useCallback(() => {
    if (soundEnabled) audioManager.play('error');
  }, [soundEnabled]);

  const playClick = useCallback(() => {
    if (soundEnabled) audioManager.play('click');
  }, [soundEnabled]);

  const playFlip = useCallback(() => {
    if (soundEnabled) audioManager.play('flip');
  }, [soundEnabled]);

  const playWarning = useCallback(() => {
    if (soundEnabled) audioManager.play('warning');
  }, [soundEnabled]);

  const playComplete = useCallback(() => {
    if (soundEnabled) audioManager.play('complete');
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { soundEnabled: !soundEnabled } });
  }, [dispatch, soundEnabled]);

  return {
    soundEnabled,
    playSuccess,
    playError,
    playClick,
    playFlip,
    playWarning,
    playComplete,
    toggleSound,
  };
}
