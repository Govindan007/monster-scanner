/**
 * VEIL — Phase 7: Horror Atmosphere & Immersion Service
 * Coordinates suspense intensity, visual distortion triggers,
 * master horror settings (visuals, audio, haptics), and creature appearance effects.
 */

import { soundEffects } from './soundEffects';

const SETTINGS_KEY = 'veil_horror_settings_v1';

export const SuspenseLevels = {
  NONE: 0.0,
  LOW: 0.25,
  MEDIUM: 0.5,
  HIGH: 0.75,
  MAX: 1.0,
};

class HorrorAtmosphereService {
  constructor() {
    this.visualEffectsEnabled = true;
    this.audioEnabled = true;
    this.hapticsEnabled = true;
    this.masterVolume = 0.75;
    this.currentSuspense = 0.0;
    this.listeners = new Set();

    this.loadSettings();
  }

  loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.visualEffectsEnabled === 'boolean') {
          this.visualEffectsEnabled = parsed.visualEffectsEnabled;
        }
        if (typeof parsed.audioEnabled === 'boolean') {
          this.audioEnabled = parsed.audioEnabled;
        }
        if (typeof parsed.hapticsEnabled === 'boolean') {
          this.hapticsEnabled = parsed.hapticsEnabled;
        }
        if (typeof parsed.masterVolume === 'number') {
          this.masterVolume = Math.max(0, Math.min(1, parsed.masterVolume));
        }
      }
    } catch {
      // Use defaults
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          visualEffectsEnabled: this.visualEffectsEnabled,
          audioEnabled: this.audioEnabled,
          hapticsEnabled: this.hapticsEnabled,
          masterVolume: this.masterVolume,
        })
      );
    } catch {
      // Catch storage error
    }
    this.notify();
  }

  getSettings() {
    return {
      visualEffectsEnabled: this.visualEffectsEnabled,
      audioEnabled: this.audioEnabled,
      hapticsEnabled: this.hapticsEnabled,
      masterVolume: this.masterVolume,
    };
  }

  setVisualEffectsEnabled(enabled) {
    this.visualEffectsEnabled = Boolean(enabled);
    this.saveSettings();
  }

  setAudioEnabled(enabled) {
    this.audioEnabled = Boolean(enabled);
    soundEffects.setMuted(!this.audioEnabled);
    this.saveSettings();
  }

  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, Number(volume) || 0));
    soundEffects.setMasterVolume(this.masterVolume);
    this.saveSettings();
  }

  setHapticsEnabled(enabled) {
    this.hapticsEnabled = Boolean(enabled);
    this.saveSettings();
  }

  /**
   * Calculates suspense intensity (0.0 to 1.0) given the active encounter state
   */
  calculateSuspense(encounterState, isScanning = false) {
    if (!this.visualEffectsEnabled) return 0.0;

    switch (encounterState) {
      case 'DORMANT':
        return 0.0;
      case 'APPEARING':
        return 0.35;
      case 'OBSERVING':
        return isScanning ? 0.85 : 0.25;
      case 'DISTURBED':
        return 0.8;
      case 'SCANNING':
        return 0.95;
      case 'RESOLVED':
        return 0.15;
      case 'ESCAPING':
        return 0.45;
      default:
        return 0.0;
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const settings = this.getSettings();
    this.listeners.forEach((cb) => {
      try {
        cb(settings);
      } catch {
        // Listener error
      }
    });
  }
}

export const horrorAtmosphere = new HorrorAtmosphereService();
