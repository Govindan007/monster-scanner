import React, { useState, useEffect } from 'react';
import { soundEffects } from '../services/soundEffects';
import HumanoidEntity from './HumanoidEntity';
import EntitySelector from './EntitySelector';
import HorrorAtmosphereOverlay from './HorrorAtmosphereOverlay';
import { getEntityById, getDefaultEntity } from '../ar/entities/EntityRegistry';

export default function ScannerOverlay({
  activeAnomaly,
  realityIntegrity,
  anomalyCount,
  scanStatus,
  glitchActive,
  selectedEntityId = 'the-watcher',
  onSelectEntityId,
  onTriggerScan,
  onRecalibrate,
  onExit,
  isSimulated,
  onToggleSimulated,
  showDiagnostics,
  setShowDiagnostics,
  onEnterRealAR,
  isEnteringAR = false,
  arSupported,
  arUnsupportedNotice,
  setArUnsupportedNotice,
  onOpenJournal,
  unreviewedEvidenceCount = 0,
  onOpenRadar,
  onOpenSettings,
}) {
  const [isMuted, setIsMuted] = useState(soundEffects.isMuted());
  const [timecode, setTimecode] = useState('00:00:00:00');
  const [fluctuatingFreq, setFluctuatingFreq] = useState(88.4);
  const [showSelector, setShowSelector] = useState(false);

  const currentEntity = getEntityById(selectedEntityId) || getDefaultEntity();

  // Timecode generator
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
      setTimecode(`${h}:${m}:${s}:${ms}`);
    }, 50);

    return () => clearInterval(timer);
  }, []);

  // Fluctuating frequency meter
  useEffect(() => {
    const freqTimer = setInterval(() => {
      if (activeAnomaly) {
        setFluctuatingFreq((Math.random() * 20 + 130).toFixed(1));
      } else {
        setFluctuatingFreq((Math.random() * 1.5 + 87.8).toFixed(1));
      }
    }, 400);

    return () => clearInterval(freqTimer);
  }, [activeAnomaly]);

  const toggleSound = () => {
    const next = !isMuted;
    soundEffects.setMuted(next);
    setIsMuted(next);
    if (!next) {
      soundEffects.playButtonBeep(880, 0.05);
    }
  };

  const handleManualScan = () => {
    soundEffects.playRadarPulse();
    onTriggerScan();
  };

  const handleRecalibrateClick = () => {
    soundEffects.playButtonBeep(1200, 0.1);
    onRecalibrate();
  };

  // Determine integrity status color
  const integrityColorClass =
    realityIntegrity > 60
      ? 'integrity-high'
      : realityIntegrity > 30
      ? 'integrity-mid'
      : 'integrity-critical';

  return (
    <div className={`scanner-hud-container ${glitchActive ? 'glitch-flicker-active' : ''}`}>
      {/* CRT Scanline & Phosphor Vignette Overlays */}
      <div className="crt-scanlines"></div>
      <div className="crt-vignette"></div>

      {/* Screen Glitch Flash Overlay */}
      {glitchActive && (
        <div className="glitch-screen-burst" aria-hidden="true">
          <div className="glitch-color-channel-r"></div>
          <div className="glitch-color-channel-b"></div>
          <div className="glitch-scan-slice"></div>
        </div>
      )}

      {/* Phase 7: Horror Atmosphere & Suspense Overlay */}
      <HorrorAtmosphereOverlay
        encounterState={activeAnomaly ? 'DISTURBED' : 'DORMANT'}
        isScanning={glitchActive || scanStatus.includes('DETECTED')}
        activeEntityId={selectedEntityId}
      />

      {/* TOP HEADER BAR */}
      <header className="scanner-header">
        <div className="header-left">
          <div className="active-badge">
            <span className="pulsing-record-dot"></span>
            <span className="brand-text">VEIL // ACTIVE</span>
          </div>
          <div className="device-telemetry">
            <span className="dim-label">SYNC:</span> 1.04λ | <span className="dim-label">TIME:</span> {timecode}
          </div>
        </div>

        <div className="header-right">
          {/* Entity Selector trigger */}
          <button
            className="hud-entity-select-btn"
            onClick={() => setShowSelector(true)}
            title="Configure Target Entity / Codex"
          >
            <span className="hud-entity-icon">◈</span>
            <span className="hud-entity-name">{currentEntity.name}</span>
            <span className="hud-entity-arrow">▾</span>
          </button>

          {/* Investigation Journal */}
          {onOpenJournal && (
            <button
              className="hud-icon-button hud-journal-btn"
              onClick={onOpenJournal}
              title="Open Paranormal Investigation Journal & Dossiers"
            >
              <span>📁</span>
              {unreviewedEvidenceCount > 0 && (
                <span className="hud-badge-counter">{unreviewedEvidenceCount}</span>
              )}
            </button>
          )}

          {/* Anomaly Radar Matrix */}
          {onOpenRadar && (
            <button
              className="hud-icon-button hud-radar-btn"
              onClick={onOpenRadar}
              title="Open Optical Anomaly Radar Matrix"
            >
              <span>📡</span>
            </button>
          )}

          {/* Diagnostics toggle */}
          <button
            className={`hud-icon-button ${showDiagnostics ? 'active-diag' : ''}`}
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            title="System & Camera Diagnostics"
          >
            DIAG
          </button>

          {/* Feed toggle */}
          <button
            className="hud-icon-button"
            onClick={() => onToggleSimulated(!isSimulated)}
            title="Toggle Live Camera / Simulated Feed"
          >
            {isSimulated ? 'CAM' : 'SIM'}
          </button>

          {/* Immersion & Audio Settings toggle */}
          {onOpenSettings && (
            <button
              className="hud-icon-button"
              onClick={onOpenSettings}
              title="Immersion, Audio & Horror Settings"
            >
              ⚙
            </button>
          )}

          {/* Sound toggle */}
          <button
            className={`hud-icon-button ${isMuted ? 'muted' : ''}`}
            onClick={toggleSound}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Return / Power Off */}
          <button
            className="hud-icon-button danger"
            onClick={onExit}
            title="Exit Scanner"
          >
            ✕
          </button>
        </div>
      </header>

      {/* CENTRAL VIEWFINDER & TARGETING RETICLE */}
      <div className="reticle-area">
        {/* Corner HUD Brackets */}
        <div className="hud-corner top-left"></div>
        <div className="hud-corner top-right"></div>
        <div className="hud-corner bottom-left"></div>
        <div className="hud-corner bottom-right"></div>

        {/* Central Tactical Reticle */}
        <div className={`reticle-ring ${activeAnomaly ? 'tracking-lock' : ''}`}>
          <div className="crosshair-h"></div>
          <div className="crosshair-v"></div>
          <div className="center-dot"></div>
          <div className="outer-radar-sweep"></div>
        </div>

        {/* Lateral Sensor Readouts */}
        <div className="reticle-telemetry left">
          <div className="spec-label">RF SPECTRAL</div>
          <div className="spec-value">{fluctuatingFreq} MHz</div>
          <div className="mini-bars">
            <span className="bar b1"></span>
            <span className="bar b2"></span>
            <span className="bar b3"></span>
            <span className="bar b4"></span>
          </div>
        </div>

        <div className="reticle-telemetry right">
          <div className="spec-label">GRID COORD</div>
          <div className="spec-value">X: 41.9 / Y: -87.6</div>
          <div className="sensor-state">LENS: SENSITIZED</div>
        </div>
      </div>

      {/* ACTIVE ANOMALY VISUAL & TRACKING OVERLAY */}
      {activeAnomaly && (
        <div
          className="anomaly-entity-wrapper"
          style={{
            top: `${activeAnomaly.position.y}%`,
            left: `${activeAnomaly.position.x}%`,
          }}
        >
          {/* Atmospheric Inline SVG Humanoid Entity */}
          <div className="humanoid-wrapper-glow">
            <HumanoidEntity />
          </div>

          {/* Tactical Bounding Box locking onto the entity */}
          <div className="anomaly-target-hud">
            <div className="target-box-corners"></div>
            <div className="target-alert-tag">⚠ ANOMALY DETECTED</div>
            <div className="target-title">UNKNOWN ENTITY</div>
            <div className="target-meta">
              <span>STATUS: ANOMALY DETECTED</span>
              <span>DIST: {activeAnomaly.distance}m</span>
            </div>
          </div>
        </div>
      )}

      {/* GLITCH RED WARNING ON MANIFESTATION */}
      {glitchActive && (
        <div className="glitch-emergency-alert">
          <div className="glitch-emergency-banner">
            <span className="flicker-text">⚠ ANOMALY DETECTED // UNKNOWN ENTITY ⚠</span>
          </div>
        </div>
      )}

      {/* BOTTOM SCANNER TELEMETRY PANEL */}
      <footer className="scanner-bottom-panel">
        {/* Status bar */}
        <div className="status-readout-row">
          <div className="status-label">SCAN STATUS:</div>
          <div className={`status-value ${activeAnomaly ? 'status-detected' : ''}`}>
            {scanStatus}
          </div>
        </div>

        {/* Tactical Metrics Grid */}
        <div className="telemetry-grid">
          {/* Reality Integrity Meter */}
          <div className="metric-box">
            <div className="metric-header">
              <span className="metric-title">REALITY INTEGRITY</span>
              <span className={`metric-percentage ${integrityColorClass}`}>
                {realityIntegrity}%
              </span>
            </div>
            <div className="integrity-bar-track">
              <div
                className={`integrity-bar-fill ${integrityColorClass}`}
                style={{ width: `${Math.max(0, realityIntegrity)}%` }}
              ></div>
            </div>
          </div>

          {/* Anomalies Detected Counter */}
          <div className="metric-box anomaly-counter-box">
            <div className="metric-title">ANOMALIES</div>
            <div className="metric-count-large">{anomalyCount}</div>
          </div>
        </div>

        {/* Low Reality Warning Banner */}
        {realityIntegrity <= 40 && (
          <div className="critical-warning-strip">
            <span className="blink-fast">CRITICAL: METAPHYSICAL RIFT TEARING. RECALIBRATE.</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="scanner-actions-row">
          <button
            id="scan-button"
            className="action-btn scan-pulse-btn"
            onClick={handleManualScan}
            disabled={Boolean(activeAnomaly)}
          >
            <span className="btn-icon">⚡</span>
            <span className="btn-text">
              {activeAnomaly ? 'ANALYZING SIGNAL...' : 'SCAN / PULSE SENSOR'}
            </span>
          </button>

          {realityIntegrity < 100 && (
            <button
              className="action-btn recalibrate-btn"
              onClick={handleRecalibrateClick}
              title="Stabilize reality integrity back to 100%"
            >
              PURGE / RECALIBRATE
            </button>
          )}
        </div>

        {/* Prominent ENTER REAL AR Button */}
        <button
          id="enter-ar-button"
          className="action-btn enter-ar-btn"
          onClick={onEnterRealAR}
          disabled={isEnteringAR}
          title="Launch Real-World Tracked WebXR AR (Hit-Test on physical surfaces)"
        >
          <span className="btn-icon">🌐</span>
          <span className="btn-text">
            {isEnteringAR ? 'CONNECTING TO AR...' : 'ENTER REAL AR'}
          </span>
          <span className={`ar-badge-tag ${arSupported ? 'ready' : 'info'}`}>
            {isEnteringAR ? 'STARTING' : arSupported ? 'WEBXR READY' : 'WEBXR'}
          </span>
        </button>
      </footer>

      {/* AR Unsupported Explanation Modal */}
      {arUnsupportedNotice && (
        <div className="ar-modal-overlay">
          <div className="ar-modal-card">
            <div className="ar-modal-badge">⚠ HARDWARE / BROWSER NOTICE</div>
            <h3 className="ar-modal-title">WebXR Immersive-AR Unavailable</h3>
            <p className="ar-modal-text">
              Real world-tracked AR requires hardware and browser support for the{' '}
              <strong>WebXR Device API (immersive-ar)</strong> with surface hit-testing.
            </p>
            <div className="ar-modal-reason">
              <span className="reason-label">DEVICE STATUS:</span> {arUnsupportedNotice}
            </div>
            <p className="ar-modal-clarification">
              VEIL uses real plane tracking for AR. Screen overlays are not falsely labeled as real AR.
              You can continue using the optical camera scanner.
            </p>
            <button
              className="cyber-button-sm primary"
              onClick={() => setArUnsupportedNotice(null)}
            >
              CONTINUE OPTICAL SCANNER
            </button>
          </div>
        </div>
      )}

      {/* Manual Entity Selector Modal */}
      <EntitySelector
        isOpen={showSelector}
        selectedEntityId={selectedEntityId}
        onSelectEntity={(entity) => {
          if (onSelectEntityId) onSelectEntityId(entity.id);
          setShowSelector(false);
        }}
        onClose={() => setShowSelector(false)}
      />
    </div>
  );
}
