import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ARManager } from '../ar/ARManager';
import { soundEffects } from '../services/soundEffects';

export default function RealWorldAR({ onExitAR, onEntityPlaced, onEncounterRecorded }) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const arManagerRef = useRef(null);

  const [surfaceDetected, setSurfaceDetected] = useState(false);
  const [placedCount, setPlacedCount] = useState(0);
  const [confirmationNotice, setConfirmationNotice] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Scanning interaction state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState(null);
  const [scanGlitch, setScanGlitch] = useState(false);

  const noticeTimerRef = useRef(null);
  const scanTimerRef = useRef(null);

  // Synchronized callback refs so prop updates do not re-trigger session initialization
  const onExitARRef = useRef(onExitAR);
  const onEntityPlacedRef = useRef(onEntityPlaced);
  const onEncounterRecordedRef = useRef(onEncounterRecorded);

  useEffect(() => {
    onExitARRef.current = onExitAR;
    onEntityPlacedRef.current = onEntityPlaced;
    onEncounterRecordedRef.current = onEncounterRecorded;
  });

  // Handle explicit placement button or XR tap
  const handlePlaceEntity = useCallback(() => {
    if (!arManagerRef.current || isScanning) return;

    soundEffects.playAnomalySpawn();
    const placed = arManagerRef.current.placeEntityAtCurrentReticle();

    if (placed) {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      setConfirmationNotice('THE WATCHER MANIFESTED // POSITION LOCKED IN REAL SPACE');
      noticeTimerRef.current = setTimeout(() => {
        setConfirmationNotice(null);
      }, 3500);
    }
  }, [isScanning]);

  // Handle scanning interaction
  const handleStartScan = useCallback(() => {
    if (placedCount === 0 || isScanning || !arManagerRef.current) return;

    setIsScanning(true);
    setScanProgress(0);
    setScanResult(null);
    soundEffects.playRadarPulse();

    let currentProgress = 0;
    const interval = 80;
    const totalDuration = 1800; // 1.8 seconds scan
    const step = (interval / totalDuration) * 100;

    scanTimerRef.current = setInterval(() => {
      currentProgress += step;
      if (currentProgress >= 100) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
        setScanProgress(100);

        // Scan completes: trigger DISTURBED state on Watcher!
        const result = arManagerRef.current.scanPlacedEntities();
        soundEffects.playAnomalySpawn();

        // Brief visual screen glitch
        setScanGlitch(true);
        setTimeout(() => setScanGlitch(false), 450);

        setIsScanning(false);
        setScanResult(result);

        // Record ONE successful encounter
        if (onEncounterRecordedRef.current) {
          onEncounterRecordedRef.current();
        }
      } else {
        setScanProgress(Math.floor(currentProgress));
        if (Math.random() < 0.2) {
          soundEffects.playRadarPulse();
        }
      }
    }, interval);
  }, [isScanning, placedCount]);

  // Handle purging / dissolving the placed entity
  const handlePurgeEntity = useCallback(() => {
    if (!arManagerRef.current) return;
    soundEffects.playAnomalyLost();

    arManagerRef.current.purgePlacedEntities(() => {
      setPlacedCount(0);
      setScanResult(null);
      setConfirmationNotice('ENTITY ENCOUNTER CONCLUDED // REALITY RE-STABILIZED');
      setTimeout(() => setConfirmationNotice(null), 3000);
    });
  }, []);

  // Handle exit
  const handleExit = useCallback(() => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    if (arManagerRef.current) {
      arManagerRef.current.endSession();
    } else if (onExitARRef.current) {
      onExitARRef.current();
    }
  }, []);

  // Authoritative Single-Mount Session Initialization
  useEffect(() => {
    let isMounted = true;
    if (!containerRef.current || !overlayRef.current) return;

    const manager = new ARManager({
      canvasContainer: containerRef.current,
      domOverlayRoot: overlayRef.current,
      onSurfaceStateChange: (hasSurface) => {
        if (isMounted) setSurfaceDetected(hasSurface);
      },
      onEntityPlaced: (count) => {
        if (isMounted) setPlacedCount(count);
        if (onEntityPlacedRef.current) onEntityPlacedRef.current();
      },
      onError: (msg) => {
        if (isMounted) setErrorMessage(msg);
      },
      onSessionEnded: () => {
        if (onExitARRef.current) {
          onExitARRef.current();
        }
      },
    });

    arManagerRef.current = manager;
    manager.startSession();

    return () => {
      isMounted = false;
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      if (arManagerRef.current) {
        const mgr = arManagerRef.current;
        arManagerRef.current = null;
        mgr.endSession().catch(() => {});
        mgr.cleanup();
      }
    };
  }, []);

  return (
    <div className={`real-world-ar-container ${scanGlitch ? 'glitch-flicker-active' : ''}`}>
      {/* Three.js Canvas Holder */}
      <div ref={containerRef} className="webxr-canvas-holder" />

      {/* Screen Glitch Flash Overlay on Scan Reaction */}
      {scanGlitch && (
        <div className="glitch-screen-burst" aria-hidden="true">
          <div className="glitch-color-channel-r"></div>
          <div className="glitch-color-channel-b"></div>
        </div>
      )}

      {/* WebXR DOM Overlay for VEIL Horror UI */}
      <div ref={overlayRef} className="webxr-dom-overlay">
        {/* Top Header Bar */}
        <header className="ar-hud-header">
          <div className="ar-hud-badge">
            <span className="ar-pulse-dot"></span>
            <span>VEIL // REAL WORLD AR</span>
          </div>
          <button className="ar-exit-button" onClick={handleExit}>
            ✕ EXIT AR
          </button>
        </header>

        {/* Central Guidance & Confirmation Alert */}
        <div className="ar-guidance-container">
          {errorMessage ? (
            <div className="ar-error-card">
              <div className="ar-error-title">⚠ AR INITIALIZATION FAULT</div>
              <p className="ar-error-body">{errorMessage}</p>
              <button className="cyber-button-sm primary" onClick={handleExit}>
                RETURN TO CAMERA SCANNER
              </button>
            </div>
          ) : isScanning ? (
            /* Active Scan Progress Card */
            <div className="ar-scan-progress-card">
              <div className="ar-scan-progress-label">
                <span className="blink-fast">⚡</span> ANALYZING METAPHYSICAL FREQUENCY...
              </div>
              <div className="ar-scan-progress-track">
                <div
                  className="ar-scan-progress-fill"
                  style={{ width: `${scanProgress}%` }}
                ></div>
              </div>
              <div className="ar-scan-progress-meta">
                <span>RESONANCE FLUX: HIGH</span>
                <span>{scanProgress}% COMPLETE</span>
              </div>
            </div>
          ) : scanResult ? (
            /* Scan Identification Result Card */
            <div className="ar-scan-result-card">
              <div className="ar-result-tag">⚠ ANOMALY IDENTIFIED // THREAT DETECTED</div>
              <div className="ar-result-title">{scanResult.name}</div>
              <div className="ar-result-code">{scanResult.code}</div>
              <div className="ar-result-grid">
                <div>
                  <span className="dim">THREAT LEVEL:</span>{' '}
                  <span className="highlight-red">{scanResult.threat}</span>
                </div>
                <div>
                  <span className="dim">FREQUENCY:</span>{' '}
                  <span className="highlight-cyan">{scanResult.resonance}</span>
                </div>
              </div>
              <div className="ar-result-behavior">
                BEHAVIOR: FIXATING ON OBSERVATION POSITION. ENTITY DISTURBED BY ACTIVE SCAN.
              </div>
            </div>
          ) : confirmationNotice ? (
            <div className="ar-confirmation-banner">
              <span className="ar-confirm-tag">⚠ ANOMALY DETECTED</span>
              <span className="ar-confirm-text">{confirmationNotice}</span>
            </div>
          ) : (
            <div className="ar-status-banner">
              {placedCount > 0 ? (
                <span className="ar-locked-text">
                  THE WATCHER ACTIVE // WALK AROUND ENTITY OR TRIGGER SCAN
                </span>
              ) : surfaceDetected ? (
                <span className="ar-blink-text">
                  SURFACE DETECTED // TAP SCREEN OR BUTTON TO PLACE THE WATCHER
                </span>
              ) : (
                <span>POINT CAMERA SLOWLY TOWARD FLOOR OR TABLE...</span>
              )}
            </div>
          )}
        </div>

        {/* Bottom Controls & Telemetry */}
        {!errorMessage && (
          <footer className="ar-bottom-panel">
            {/* Primary Action Button Bar */}
            <div className="ar-actions-row">
              {placedCount === 0 ? (
                /* Placement Button */
                <button
                  id="ar-place-button"
                  className={`ar-placement-btn ${surfaceDetected ? 'active' : 'disabled'}`}
                  onClick={handlePlaceEntity}
                  disabled={!surfaceDetected}
                  title={surfaceDetected ? 'Anchor entity to detected surface' : 'Scan for floor/surface first'}
                >
                  <span className="ar-btn-icon">⚡</span>
                  <span className="ar-btn-label">
                    {surfaceDetected ? 'MANIFEST THE WATCHER' : 'SCANNING FOR SURFACE...'}
                  </span>
                </button>
              ) : (
                /* Post-placement options: Scan or Disperse */
                <div className="ar-encounter-controls">
                  <button
                    id="ar-scan-button"
                    className="action-btn scan-pulse-btn ar-active-scan-btn"
                    onClick={handleStartScan}
                    disabled={isScanning}
                  >
                    <span className="btn-icon">⚡</span>
                    <span className="btn-text">
                      {isScanning ? 'ANALYZING...' : 'SCAN / PULSE ENTITY'}
                    </span>
                  </button>

                  <button
                    id="ar-purge-button"
                    className="action-btn recalibrate-btn ar-purge-btn"
                    onClick={handlePurgeEntity}
                    disabled={isScanning}
                    title="Dissolve and conclude encounter with The Watcher"
                  >
                    DISPERSE ENTITY
                  </button>
                </div>
              )}
            </div>

            {/* AR Telemetry Readouts */}
            <div className="ar-bottom-telemetry">
              <div className="ar-telemetry-row">
                <span className="ar-dim">SURFACE TRACKING:</span>
                <span className={`ar-highlight ${surfaceDetected ? 'locked' : ''}`}>
                  {surfaceDetected ? 'PLANE LOCKED (HIT-TEST OK)' : 'SEARCHING PLANE'}
                </span>
              </div>
              <div className="ar-telemetry-row">
                <span className="ar-dim">ENTITY STATUS:</span>
                <span className="ar-highlight">
                  {placedCount > 0 ? 'THE WATCHER (OBSERVING)' : 'SEARCHING FOR METAPHYSICAL RIFT'}
                </span>
              </div>
              <div className="ar-instructions">
                {placedCount > 0
                  ? 'Walk around The Watcher in 3D room space. Press SCAN to analyze resonance.'
                  : 'Move phone across floor or table until the red reticle locks onto a plane.'}
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
