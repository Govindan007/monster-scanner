import React from 'react';
import { soundEffects } from '../services/soundEffects';

export default function LandingScreen({
  onStartScan,
  onStartSimulated,
  onOpenJournal,
  unreviewedEvidenceCount = 0,
  onOpenRadar,
}) {

  const handleStart = (useSimulated = false) => {
    // User interaction enables Web Audio
    soundEffects.init();
    soundEffects.playRadarPulse();
    soundEffects.startAmbientHum();
    if (useSimulated) {
      onStartSimulated();
    } else {
      onStartScan();
    }
  };

  return (
    <div className="landing-container">
      {/* Background CRT and Scanlines */}
      <div className="crt-scanlines"></div>
      <div className="landing-grid-bg"></div>
      <div className="landing-vignette"></div>

      {/* Main Container */}
      <main className="landing-content">
        {/* Classified Banner */}
        <div className="classified-tag">
          <span className="dot-red"></span>
          <span>RESTRICTED RESEARCH // DEPT. OF ABNORMAL OPTICS</span>
        </div>

        {/* Title Block */}
        <div className="landing-title-block">
          <h1 className="landing-title" data-text="VEIL">
            VEIL
          </h1>
          <div className="landing-subtitle">
            <span className="bracket">[</span> REALITY SCANNER <span className="bracket">]</span>
          </div>
        </div>

        {/* Lore & Instructions */}
        <div className="landing-lore-card">
          <p className="lore-headline">
            &ldquo;Something is occupying the space between realities.&rdquo;
          </p>
          <p className="lore-body">
            VEIL utilizes mobile optical sensors tuned to phase-shifted electromagnetic frequencies.
            Entities coexisting within our physical coordinate space—imperceptible to biological vision—can
            now be registered and localized.
          </p>

          <div className="telemetry-specs">
            <div className="spec-row">
              <span className="spec-k">SENSOR ARRAY:</span>
              <span className="spec-v">OPTICAL SPECTRUM INVERSION</span>
            </div>
            <div className="spec-row">
              <span className="spec-k">SECURE CONTEXT (HTTPS):</span>
              <span className={`spec-v ${typeof window !== 'undefined' && (window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost') ? 'ready' : 'warn'}`}>
                {typeof window !== 'undefined' && (window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost') ? 'YES (ACTIVE)' : 'NO (HTTP INSECURE)'}
              </span>
            </div>
            <div className="spec-row">
              <span className="spec-k">CAMERA API (getUserMedia):</span>
              <span className={`spec-v ${typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia ? 'ready' : 'warn'}`}>
                {typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia ? 'AVAILABLE' : 'UNAVAILABLE (REQUIRES HTTPS)'}
              </span>
            </div>
            <div className="spec-row">
              <span className="spec-k">DIRECTIVE:</span>
              <span className="spec-v warn">DO NOT MAKE DIRECT EYE CONTACT</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="landing-actions">
          <button
            id="start-scan-btn"
            className="start-scan-button"
            onMouseEnter={() => {
              soundEffects.playButtonBeep(440, 0.04);
            }}
            onClick={() => handleStart(false)}
          >
            <span className="btn-bracket-l">&lt;</span>
            <span className="btn-label">START SCAN</span>
            <span className="btn-bracket-r">&gt;</span>
            <div className="btn-scanner-light"></div>
          </button>

          {onOpenJournal && (
            <button
              type="button"
              id="landing-journal-btn"
              className="landing-journal-button"
              onClick={() => {
                soundEffects.playButtonBeep(520, 0.05);
                onOpenJournal();
              }}
            >
              <span>📁 INVESTIGATION JOURNAL &amp; DOSSIERS</span>
              {unreviewedEvidenceCount > 0 && (
                <span className="journal-badge-pulse">{unreviewedEvidenceCount} NEW</span>
              )}
            </button>
          )}

          {onOpenRadar && (
            <button
              type="button"
              id="landing-radar-btn"
              className="landing-radar-button"
              onClick={() => {
                soundEffects.playButtonBeep(640, 0.06);
                onOpenRadar();
              }}
            >
              <span>📡 OPTICAL ANOMALY RADAR MATRIX</span>
            </button>
          )}

          <p className="permission-note">
            Camera permission required for live optical detection.
          </p>

          <button
            className="simulated-feed-link"
            onClick={() => handleStart(true)}
            title="Run on desktop or without camera"
          >
            🖥 RUN SIMULATED CHAMBER FEED (NO CAMERA)
          </button>
        </div>

        {/* Technical Footer */}
        <footer className="landing-footer">
          <div>SYS_BUILD: 2.8.4-X // PROTOCOL OMEGA-7</div>
          <div>HOLD DEVICE VERTICALLY // HEADPHONES RECOMMENDED</div>
        </footer>
      </main>
    </div>
  );
}
