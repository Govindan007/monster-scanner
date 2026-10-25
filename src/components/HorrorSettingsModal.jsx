import React, { useState, useEffect } from 'react';
import { horrorAtmosphere } from '../services/horrorAtmosphereService';
import { soundEffects } from '../services/soundEffects';

export default function HorrorSettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(() => horrorAtmosphere.getSettings());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );

  useEffect(() => {
    const unsub = horrorAtmosphere.subscribe((updated) => {
      setSettings(updated);
    });

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = (e) => setPrefersReducedMotion(e.matches);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler);
        return () => {
          unsub();
          mediaQuery.removeEventListener('change', handler);
        };
      }
    }

    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleToggleVisuals = () => {
    const next = !settings.visualEffectsEnabled;
    horrorAtmosphere.setVisualEffectsEnabled(next);
    soundEffects.playButtonBeep(next ? 620 : 380, 0.05);
  };

  const handleToggleAudio = () => {
    const next = !settings.audioEnabled;
    horrorAtmosphere.setAudioEnabled(next);
    soundEffects.playButtonBeep(next ? 660 : 340, 0.05);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    horrorAtmosphere.setMasterVolume(val);
  };

  const handleVolumePreview = () => {
    soundEffects.playButtonBeep(580, 0.06);
  };

  const handleToggleHaptics = () => {
    const next = !settings.hapticsEnabled;
    horrorAtmosphere.setHapticsEnabled(next);
    if (next && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
    soundEffects.playButtonBeep(next ? 700 : 350, 0.05);
  };

  return (
    <div
      className="settings-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Immersion & Horror Settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="settings-modal-header">
          <div className="settings-title-box">
            <span className="settings-icon">⚙</span>
            <div>
              <div className="settings-title-main">IMMERSION &amp; AUDIO CONTROLS</div>
              <div className="settings-title-sub">HARDWARE MATRIX &amp; ATMOSPHERIC INTENSITY</div>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose} title="Close Settings">
            ✕
          </button>
        </header>

        <div className="settings-modal-body">
          {/* Audio Section */}
          <section className="settings-group-card">
            <div className="settings-group-header">
              <span className="group-title">🔊 AUDIO ARCHITECTURE</span>
              <button
                type="button"
                className={`settings-toggle-btn ${settings.audioEnabled ? 'active' : ''}`}
                onClick={handleToggleAudio}
              >
                {settings.audioEnabled ? 'AUDIO: ENABLED' : 'AUDIO: MUTED'}
              </button>
            </div>

            <div className="settings-control-row">
              <label htmlFor="master-volume-slider" className="settings-label">
                MASTER VOLUME ({Math.round(settings.masterVolume * 100)}%)
              </label>
              <input
                id="master-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                disabled={!settings.audioEnabled}
                onChange={handleVolumeChange}
                onMouseUp={handleVolumePreview}
                onTouchEnd={handleVolumePreview}
                className="settings-slider"
              />
            </div>
            <p className="settings-caption">
              Controls ambient mains hum, creature-specific resonance drones, radar sweep pings, and encounter stingers.
            </p>
          </section>

          {/* Visual Horror Atmosphere Section */}
          <section className="settings-group-card">
            <div className="settings-group-header">
              <span className="group-title">👁 VISUAL ATMOSPHERE</span>
              <button
                type="button"
                className={`settings-toggle-btn ${settings.visualEffectsEnabled ? 'active' : ''}`}
                onClick={handleToggleVisuals}
              >
                {settings.visualEffectsEnabled ? 'EFFECTS: ACTIVE' : 'EFFECTS: DISABLED'}
              </button>
            </div>
            <p className="settings-caption">
              Toggles chromatic diffraction fringes, suspense edge vignettes, and optical interference pulses. Never obscures vital HUD elements.
            </p>

            {prefersReducedMotion && (
              <div className="reduced-motion-notice">
                <span>⚡ System Reduced-Motion Preference Detected: Rapid flickers and violent animations are suppressed automatically.</span>
              </div>
            )}
          </section>

          {/* Haptic Feedback Section */}
          <section className="settings-group-card">
            <div className="settings-group-header">
              <span className="group-title">📳 TACTICAL HAPTIC SENSORS</span>
              <button
                type="button"
                className={`settings-toggle-btn ${settings.hapticsEnabled ? 'active' : ''}`}
                onClick={handleToggleHaptics}
              >
                {settings.hapticsEnabled ? 'HAPTICS: ACTIVE' : 'HAPTICS: OFF'}
              </button>
            </div>
            <p className="settings-caption">
              Emits gentle device vibration pulses when within radar proximity or when an entity enters agitated states.
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="settings-modal-footer">
          <span className="settings-footer-text">
            All preferences persist locally to your device. No user tracking or network telemetry.
          </span>
          <button type="button" className="settings-done-btn" onClick={onClose}>
            CONFIRM &amp; RETURN
          </button>
        </footer>
      </div>
    </div>
  );
}
