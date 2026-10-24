// Synthesized horror and tactical audio using Web Audio API
// No external audio files needed; guarantees 100% offline reliability.
// Phase 7: Immersion & Horror Polish Audio Architecture with Master Gain & Creature Presence

const AUDIO_STORAGE_KEY = 'veil_audio_settings_v1';

class SoundEffectsManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.75;
    this.muted = false;

    // Ambient loop nodes
    this.ambientOsc = null;
    this.ambientGain = null;
    this.isAmbientRunning = false;

    // Creature presence loop nodes
    this.creatureNodes = [];
    this.activeCreatureId = null;

    // Load persisted settings
    this.loadSettings();
  }

  loadSettings() {
    try {
      const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.volume === 'number') this.volume = Math.max(0, Math.min(1, parsed.volume));
        if (typeof parsed.muted === 'boolean') this.muted = parsed.muted;
      }
    } catch {
      // Use defaults
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(
        AUDIO_STORAGE_KEY,
        JSON.stringify({ volume: this.volume, muted: this.muted })
      );
    } catch {
      // Storage catch
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getMasterDestination() {
    if (!this.ctx) this.init();
    return this.masterGain || this.ctx?.destination;
  }

  setMasterVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val) || 0));
    if (this.masterGain && this.ctx) {
      const targetGain = this.muted ? 0 : this.volume;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  getMasterVolume() {
    return this.volume;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      const targetGain = this.muted ? 0 : this.volume;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
    this.saveSettings();
  }

  isMuted() {
    return this.muted;
  }

  // Subtle continuous low analog hum
  startAmbientHum() {
    if (!this.ctx) this.init();
    if (this.isAmbientRunning || !this.ctx) return;

    try {
      this.isAmbientRunning = true;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(54, this.ctx.currentTime); // 54Hz mains hum

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(110, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getMasterDestination());

      osc.start();
      this.ambientOsc = osc;
      this.ambientGain = gain;
    } catch {
      // Audio autoplay policy catch
    }
  }

  stopAmbientHum() {
    if (this.ambientOsc) {
      try {
        this.ambientOsc.stop();
        this.ambientOsc.disconnect();
      } catch {
        // ignore
      }
      this.ambientOsc = null;
      this.isAmbientRunning = false;
    }
  }

  // Phase 7: Creature-Specific Ambient Presence Loops
  startCreaturePresence(entityId) {
    if (!this.ctx) this.init();
    if (!this.ctx || this.activeCreatureId === entityId) return;

    this.stopCreaturePresence();
    this.activeCreatureId = entityId;

    try {
      const now = this.ctx.currentTime;
      const dest = this.getMasterDestination();

      if (entityId === 'the-watcher') {
        // THE WATCHER: Subsonic Gaze Hum (58Hz + 432Hz dissonant binaural harmonic)
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(58, now);
        subGain.gain.setValueAtTime(0.035, now);

        const high = this.ctx.createOscillator();
        const highGain = this.ctx.createGain();
        high.type = 'triangle';
        high.frequency.setValueAtTime(432, now);
        highGain.gain.setValueAtTime(0.015, now);

        sub.connect(subGain);
        subGain.connect(dest);
        high.connect(highGain);
        highGain.connect(dest);

        sub.start(now);
        high.start(now);

        this.creatureNodes = [sub, high, subGain, highGain];
      } else if (entityId === 'the-drifter') {
        // THE DRIFTER: Levitating Crystalline Modulations (220Hz + 660Hz with soft LFO tremolo)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        oscGain.gain.setValueAtTime(0.025, now);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(1.8, now); // 1.8 Hz floating wobble
        lfoGain.gain.setValueAtTime(12, now);

        lfo.connect(osc.frequency);
        osc.connect(oscGain);
        oscGain.connect(dest);

        lfo.start(now);
        osc.start(now);

        this.creatureNodes = [osc, lfo, oscGain, lfoGain];
      } else if (entityId === 'the-crawler') {
        // THE CRAWLER: Low-frequency seismic scrape & subterranean rumble
        const rumble = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const rumbleGain = this.ctx.createGain();

        rumble.type = 'sawtooth';
        rumble.frequency.setValueAtTime(42, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(80, now);

        rumbleGain.gain.setValueAtTime(0.03, now);

        rumble.connect(filter);
        filter.connect(rumbleGain);
        rumbleGain.connect(dest);

        rumble.start(now);

        this.creatureNodes = [rumble, filter, rumbleGain];
      }
    } catch {
      // Audio catch
    }
  }

  stopCreaturePresence() {
    this.creatureNodes.forEach((node) => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (typeof node.disconnect === 'function') node.disconnect();
      } catch {
        // ignore
      }
    });
    this.creatureNodes = [];
    this.activeCreatureId = null;
  }

  // Radar ping / Scan trigger
  playRadarPulse() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.getMasterDestination());

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  // High-tension anomaly spawn sound: screeching distortion + sub drop
  playAnomalySpawn() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dest = this.getMasterDestination();

      // 1. Harsh White Noise Burst
      const bufferSize = this.ctx.sampleRate * 0.35;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1400, now);
      noiseFilter.Q.setValueAtTime(3, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(dest);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.35);

      // 2. Deep Sub Bass drop
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.7);

      subGain.gain.setValueAtTime(0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      subOsc.connect(subGain);
      subGain.connect(dest);

      subOsc.start(now);
      subOsc.stop(now + 0.7);

      // 3. Piercing discordant high frequency
      const highOsc = this.ctx.createOscillator();
      const highGain = this.ctx.createGain();
      highOsc.type = 'sawtooth';
      highOsc.frequency.setValueAtTime(940, now);
      highOsc.frequency.linearRampToValueAtTime(1240, now + 0.2);
      highOsc.frequency.linearRampToValueAtTime(680, now + 0.5);

      highGain.gain.setValueAtTime(0.08, now);
      highGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      highOsc.connect(highGain);
      highGain.connect(dest);

      highOsc.start(now);
      highOsc.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  // Anomaly disappearing dissipation sound
  playAnomalyLost() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.getMasterDestination());

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  // Quick tactile button beep
  playButtonBeep(freq = 600, duration = 0.06) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.getMasterDestination());

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // ignore
    }
  }

  // Phase 7: Scanner Progress Beep Tick
  playScanProgressTick(progress = 0) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const freq = 750 + progress * 5; // Ascends as progress advances

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.getMasterDestination());

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Audio catch
    }
  }

  // Phase 7: Scanner Abort / Failure static burst
  playScanFailure() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.3);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.getMasterDestination());

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Audio catch
    }
  }

  // Phase 7: Quick visual distortion transition audio cue
  playVisualDistortionCue() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.getMasterDestination());

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio catch
    }
  }

  // Phase 4 & 7 Horror Encounter State Audio Cues
  playEncounterStateCue(state) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dest = this.getMasterDestination();

      if (state === 'APPEARING') {
        // Deep sub-bass pulse with ascending harmonic
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(70, now);
        sub.frequency.exponentialRampToValueAtTime(140, now + 0.6);
        subGain.gain.setValueAtTime(0.2, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        sub.connect(subGain);
        subGain.connect(dest);
        sub.start(now);
        sub.stop(now + 0.6);
      } else if (state === 'DISTURBED') {
        // Piercing tritone dissonance
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(620, now);
        osc2.frequency.setValueAtTime(875, now); // ~Tritone / augmented fourth
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(dest);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
      } else if (state === 'RESOLVED') {
        // Harmonious crystal resolution chime
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0.07, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.5);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.5);
        });
      } else if (state === 'ESCAPING') {
        // Fading downward pitch dissolution
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.7);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.7);
      }
    } catch {
      // Audio policy catch
    }
  }

  // Phase 6: Radar Sweep Ping
  playRadarSweepPing() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.getMasterDestination());
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio policy catch
    }
  }

  // Phase 6: Signal Proximity Beep (pitch & rate scale with signalPct 0..100)
  playSignalBeep(signalPct = 50) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const freq = 440 + Math.min(100, Math.max(0, signalPct)) * 8.5; // 440Hz -> 1290Hz
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(this.getMasterDestination());
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio policy catch
    }
  }

  // Anomaly detected discovery sting
  playAnomalyDetected() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.getMasterDestination());

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Audio catch
    }
  }
}

export const soundEffects = new SoundEffectsManager();
