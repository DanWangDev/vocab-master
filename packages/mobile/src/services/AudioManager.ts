import { Audio } from 'expo-av';

type SoundName = 'success' | 'error' | 'click' | 'flip' | 'warning' | 'complete';

interface ToneConfig {
  frequency: number;
  duration: number;
}

// Simple tone frequency map for generating basic audio feedback
const toneConfigs: Record<SoundName, ToneConfig[]> = {
  success: [
    { frequency: 523, duration: 100 },
    { frequency: 659, duration: 100 },
    { frequency: 784, duration: 150 },
  ],
  error: [{ frequency: 200, duration: 200 }],
  click: [{ frequency: 1000, duration: 50 }],
  flip: [{ frequency: 600, duration: 80 }],
  warning: [
    { frequency: 440, duration: 100 },
    { frequency: 440, duration: 100 },
  ],
  complete: [
    { frequency: 523, duration: 120 },
    { frequency: 659, duration: 120 },
    { frequency: 784, duration: 120 },
    { frequency: 1047, duration: 250 },
  ],
};

class AudioManagerClass {
  private muted = false;
  private initialized = false;
  private sounds: Map<SoundName, Audio.Sound> = new Map();

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      this.initialized = true;
    } catch {
      // Audio initialization failed - will operate silently
    }
  }

  async play(sound: SoundName): Promise<void> {
    if (this.muted || !this.initialized) return;

    try {
      // Use preloaded sound if available
      const existing = this.sounds.get(sound);
      if (existing) {
        await existing.replayAsync();
        return;
      }

      // Generate a simple beep tone as fallback
      // expo-av doesn't support oscillator-based generation natively,
      // so we rely on bundled audio assets or haptic feedback
    } catch {
      // Silently fail
    }
  }

  async preloadSound(name: SoundName, uri: string): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }
      );
      this.sounds.set(name, sound);
    } catch {
      // Failed to preload
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  async cleanup(): Promise<void> {
    for (const sound of this.sounds.values()) {
      try {
        await sound.unloadAsync();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.sounds.clear();
  }

  getToneConfig(sound: SoundName): ToneConfig[] {
    return toneConfigs[sound];
  }
}

export const audioManager = new AudioManagerClass();
