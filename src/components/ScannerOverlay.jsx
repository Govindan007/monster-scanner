import React, { useState, useEffect } from 'react';
import { soundEffects } from '../services/soundEffects';
import CreatureSilhouette from './CreatureSilhouette';
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

  const handleSelectEntity = (entity) => {
    if (onSelectEntityId) {
      onSelectEntityId(entity.id);
    }
    setShowSelector(false);
  };

  return (
    <div className={`scanner-hud-container ${glitchActive ? 'glitch-flicker-active' : ''}`}>
      {/* Restrained CRT scanline & vignette */}
      <div className="crt-scanlines" aria-hidden="true"></div>
      <div className="crt-vignette" aria-hidden="true"></div>

      {/* Screen Glitch Flash Overlay */}
      {glitchActive && (
        <div className="glitch-screen-burst" aria-hidden="true">
          <div className="glitch-color-channel-r"></div>
          <div className="glitch-color-channel-b"></div>
          <div className="glitch-scan-slice"></div>
        </div>
      )}

      {/* Horror Atmosphere & Suspense Overlay */}
      <HorrorAtmosphereOverlay
        encounterState={activeAnomaly ? 'DISTURBED' : 'DORMANT'}
        isScanning={glitchActive || scanStatus.includes('DETECTED')}
        activeEntityId={selectedEntityId}
      />

      {/* FLOATING TOP HUD HEADER */}
      <header className="scanner-header-bar">
        <div className="hud-badge-group">
          <div className="hud-live-tag">
            <span className="live-pulse-dot"></span>
            <span className="live-brand">VEIL // ACTIVE</span>
          </div>
          <span className="hud-sync-mono">1.04λ // {timecode}</span>
        </div>

        <div className="hud-header-actions">
          {/* Active Entity Selector Chip */}
          <button
            type="button"
            className="hud-entity-chip-btn"
            onClick={() => setShowSelector(true)}
            title="Configure Active Entity Frequency"
          >
            <span className="entity-chip-glyph">◈</span>
            <span className="entity-chip-name">{currentEntity.name}</span>
            <span className="entity-chip-arrow">▾</span>
          </button>

          {/* Investigation Journal Button */}
          {onOpenJournal && (
            <button
              type="button"
              className="hud-quick-btn"
              onClick={onOpenJournal}
              title="Open Investigation Journal & Dossiers"
            >
              <span>📁</span>
              {unreviewedEvidenceCount > 0 && (
                <span className="hud-badge-pill">{unreviewedEvidenceCount}</span>
              )}
            </button>
          )}

          {/* Anomaly Radar Button */}
          {onOpenRadar && (
            <button
              type="button"
              className="hud-quick-btn"
              onClick={onOpenRadar}
              title="Open Anomaly Radar Matrix"
            >
              <span>📡</span>
            </button>
          )}

          {/* Settings Button */}
          {onOpenSettings && (
            <button
              type="button"
              className="hud-quick-btn"
              onClick={onOpenSettings}
              title="Audio & Immersion Settings"
            >
              <span>⚙</span>
            </button>
          )}

          {/* Diagnostics toggle */}
          <button
            type="button"
            className={`hud-quick-btn ${showDiagnostics ? 'active-diag' : ''}`}
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            title="Toggle Diagnostics HUD"
          >
            <span>⚡</span>
          </button>

          {/* Camera / Sim Toggle */}
          <button
            type="button"
            className="hud-quick-btn"
            onClick={() => onToggleSimulated(!isSimulated)}
            title="Toggle Live Camera / Chamber Simulator"
          >
            <span>{isSimulated ? 'CAM' : 'SIM'}</span>
          </button>

          {/* Mute Toggle */}
          <button
            type="button"
            className="hud-quick-btn"
            onClick={toggleSound}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <span>{isMuted ? '🔇' : '🔊'}</span>
          </button>

          {/* Exit Button */}
          <button
            type="button"
            className="hud-quick-btn danger"
            onClick={onExit}
            title="Exit Scanner"
          >
            <span>✕</span>
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

        {/* Lateral Telemetry Left */}
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

        {/* Lateral Telemetry Right */}
        <div className="reticle-telemetry right">
          <div className="spec-label">GRID MATRIX</div>
          <div className="spec-value">X: 41.9 / Y: -87.6</div>
          <div className="sensor-state">LENS: ACTIVE</div>
        </div>
      </div>

      {/* ACTIVE ANOMALY 2D VISUAL & TARGETING OVERLAY */}
      {activeAnomaly && (
        <div
          className="anomaly-entity-wrapper"
          style={{
            top: `${activeAnomaly.position.y}%`,
            left: `${activeAnomaly.position.x}%`,
          }}
        >
          {/* Faithful Creature Vector Silhouette */}
          <div className="creature-2d-viewport">
            <CreatureSilhouette
              entityId={selectedEntityId}
              size="normal"
              animate={true}
            />
          </div>

          {/* Tactical Bounding Box locking onto entity */}
          <div className="anomaly-target-hud">
            <div className="target-box-corners"></div>
            <div className="target-alert-tag">⚠ ANOMALY DETECTED</div>
            <div className="target-title">{currentEntity.name}</div>
            <div className="target-meta">
              <span className="meta-threat">{currentEntity.threat} THREAT</span>
              <span>DIST: {activeAnomaly.distance}m</span>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROL DECK */}
      <footer className="scanner-bottom-deck">
        {/* Status Bar */}
        <div className="scanner-status-banner">
          <span className="status-label">STATUS:</span>
          <span className={`status-text ${activeAnomaly ? 'detected' : ''}`}>
            {scanStatus}
          </span>
        </div>

        {/* Telemetry Metrics Pods */}
        <div className="telemetry-compact-row">
          <div className="metric-pod">
            <span className="pod-label">REALITY INTEGRITY</span>
            <div className="pod-meter-shell">
              <div
                className="pod-meter-fill"
                style={{
                  width: `${realityIntegrity}%`,
                  backgroundColor:
                    realityIntegrity > 60
                      ? '#00e5ff'
                      : realityIntegrity > 30
                      ? '#f59e0b'
                      : '#ef4444',
                }}
              ></div>
            </div>
            <span className="pod-val">{realityIntegrity}%</span>
          </div>

          <div className="metric-pod">
            <span className="pod-label">ANOMALIES RESOLVED</span>
            <span className="pod-val cyan">{anomalyCount}</span>
          </div>

          {realityIntegrity < 100 && (
            <button
              type="button"
              className="action-recalibrate-btn"
              onClick={handleRecalibrateClick}
              title="Stabilize reality integrity back to 100%"
            >
              RECALIBRATE
            </button>
          )}
        </div>

        {/* Primary Action Buttons Bar */}
        <div className="scanner-actions-grid">
          {/* Primary Pulse Button */}
          <button
            type="button"
            id="pulse-scan-btn"
            className="scanner-primary-action-btn pulse-action"
            onClick={handleManualScan}
            title="Send high-frequency resonance pulse to locate anomalies"
          >
            <span className="btn-icon">⚡</span>
            <span className="btn-title">PULSE SCANNER</span>
          </button>

          {/* Prominent ENTER REAL AR Button */}
          <button
            type="button"
            id="enter-ar-button"
            className="scanner-primary-action-btn enter-ar-action"
            onClick={onEnterRealAR}
            disabled={isEnteringAR}
            title="Launch Real-World Tracked WebXR AR (Hit-Test on physical surfaces)"
          >
            <span className="btn-icon">🌐</span>
            <div className="btn-stack">
              <span className="btn-title">
                {isEnteringAR ? 'CONNECTING...' : 'ENTER REAL AR'}
              </span>
              <span className={`btn-pill-sub ${arSupported ? 'ready' : 'info'}`}>
                {isEnteringAR ? 'STARTING' : arSupported ? 'WEBXR READY' : 'WEBXR'}
              </span>
            </div>
          </button>
        </div>
      </footer>

      {/* WebXR Unsupported Notice Modal */}
      {arUnsupportedNotice && (
        <div className="ar-modal-overlay" role="dialog" aria-modal="true">
          <div className="ar-modal-card">
            <div className="ar-modal-badge">⚠ HARDWARE / BROWSER NOTICE</div>
            <h3 className="ar-modal-title">WebXR Immersive-AR Unavailable</h3>
            <p className="ar-modal-text">
              Real world-tracked AR requires hardware and browser support for the{' '}
              <strong>WebXR Device API (immersive-ar)</strong> with surface hit-testing.
            </p>
            <div className="ar-modal-reason">
              <code>{arUnsupportedNotice}</code>
            </div>
            <p className="ar-modal-guidance">
              On Android, open this page in <strong>Google Chrome</strong> and ensure{' '}
              <strong>Google Play Services for AR</strong> is updated.
            </p>
            <button
              type="button"
              className="cyber-button primary"
              onClick={() => setArUnsupportedNotice(null)}
            >
              CONTINUE WITH CAMERA SCANNER
            </button>
          </div>
        </div>
      )}

      {/* Entity Selector Modal */}
      <EntitySelector
        isOpen={showSelector}
        selectedEntityId={selectedEntityId}
        onSelectEntity={handleSelectEntity}
        onClose={() => setShowSelector(false)}
      />
    </div>
  );
}
