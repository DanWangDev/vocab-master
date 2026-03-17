import { Howl } from 'howler';

type SoundName = 'success' | 'error' | 'click' | 'flip' | 'warning' | 'complete';

interface ToneConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  ramp?: 'up' | 'down' | 'both';
  secondFrequency?: number; // For two-tone sounds
}

// Web Audio API tone configurations for each sound
const toneConfigs: Record<SoundName, ToneConfig | ToneConfig[]> = {
  success: [
    { frequency: 523.25, duration: 0.1, type: 'sine', volume: 0.3 }, // C5
    { frequency: 659.25, duration: 0.1, type: 'sine', volume: 0.3 }, // E5
    { frequency: 783.99, duration: 0.15, type: 'sine', volume: 0.3 }, // G5
  ],
  error: { frequency: 200, duration: 0.2, type: 'sawtooth', volume: 0.2, ramp: 'down' },
  click: { frequency: 1000, duration: 0.05, type: 'sine', volume: 0.15 },
  flip: { frequency: 600, duration: 0.08, type: 'sine', volume: 0.2, ramp: 'both' },
  warning: [
    { frequency: 440, duration: 0.1, type: 'square', volume: 0.15 },
    { frequency: 440, duration: 0.1, type: 'square', volume: 0.15 },
  ],
  complete: [
    { frequency: 523.25, duration: 0.12, type: 'sine', volume: 0.3 }, // C5
    { frequency: 659.25, duration: 0.12, type: 'sine', volume: 0.3 }, // E5
    { frequency: 783.99, duration: 0.12, type: 'sine', volume: 0.3 }, // G5
    { frequency: 1046.50, duration: 0.25, type: 'sine', volume: 0.35 }, // C6
  ],
};

class AudioManager {
  private sounds: Map<SoundName, Howl> = new Map();
  private muted: boolean = false;
  private initialized: boolean = false;
  private audioContext: AudioContext | null = null;
  private loadedSounds: Set<SoundName> = new Set();

  constructor() {
    this.loadSounds();
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        console.debug('Web Audio API not available');
        return null;
      }
    }
    return this.audioContext;
  }

  private playTone(config: ToneConfig): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

    // Set up gain envelope
    const startTime = ctx.currentTime;
    const endTime = startTime + config.duration;

    gainNode.gain.setValueAtTime(0, startTime);

    if (config.ramp === 'up') {
      gainNode.gain.linearRampToValueAtTime(config.volume, startTime + config.duration * 0.1);
      gainNode.gain.setValueAtTime(config.volume, endTime);
    } else if (config.ramp === 'down') {
      gainNode.gain.setValueAtTime(config.volume, startTime);
      gainNode.gain.linearRampToValueAtTime(0, endTime);
    } else if (config.ramp === 'both') {
      gainNode.gain.linearRampToValueAtTime(config.volume, startTime + config.duration * 0.1);
      gainNode.gain.linearRampToValueAtTime(0, endTime);
    } else {
      // Quick attack and release
      gainNode.gain.linearRampToValueAtTime(config.volume, startTime + 0.01);
      gainNode.gain.setValueAtTime(config.volume, endTime - 0.02);
      gainNode.gain.linearRampToValueAtTime(0, endTime);
    }

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(endTime);
  }

  private playToneSequence(configs: ToneConfig[]): void {
    let delay = 0;
    configs.forEach((config) => {
      setTimeout(() => this.playTone(config), delay * 1000);
      delay += config.duration;
    });
  }

  private playWebAudioFallback(sound: SoundName): void {
    const config = toneConfigs[sound];
    if (Array.isArray(config)) {
      this.playToneSequence(config);
    } else {
      this.playTone(config);
    }
  }

  private loadSounds() {
    const soundConfigs: Record<SoundName, { src: string; volume: number }> = {
      success: { src: '/audio/success.mp3', volume: 0.5 },
      error: { src: '/audio/error.mp3', volume: 0.4 },
      click: { src: '/audio/click.mp3', volume: 0.3 },
      flip: { src: '/audio/flip.mp3', volume: 0.3 },
      warning: { src: '/audio/warning.mp3', volume: 0.4 },
      complete: { src: '/audio/complete.mp3', volume: 0.6 },
    };

    Object.entries(soundConfigs).forEach(([name, config]) => {
      try {
        const howl = new Howl({
          src: [config.src],
          volume: config.volume,
          preload: true,
          onload: () => {
            this.loadedSounds.add(name as SoundName);
          },
          onloaderror: () => {
            // Audio file not found, will use Web Audio API fallback
            console.debug(`Audio file not found: ${config.src}, using Web Audio API fallback`);
          }
        });
        this.sounds.set(name as SoundName, howl);
      } catch {
        console.debug(`Failed to load sound: ${name}`);
      }
    });

    this.initialized = true;
  }

  play(sound: SoundName): void {
    if (this.muted || !this.initialized) return;

    // Try Howler first if the sound file was loaded successfully
    if (this.loadedSounds.has(sound)) {
      const howl = this.sounds.get(sound);
      if (howl) {
        try {
          howl.play();
          return;
        } catch {
          // Fall through to Web Audio fallback
        }
      }
    }

    // Fall back to Web Audio API generated tones
    try {
      this.playWebAudioFallback(sound);
    } catch {
      // Silently fail if audio playback fails completely
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

  // Initialize audio context on user interaction (for browser autoplay policy)
  initializeOnInteraction(): void {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }
}

// Singleton instance
export const audioManager = new AudioManager();
