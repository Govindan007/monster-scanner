import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ARManager } from '../ar/ARManager';
import { soundEffects } from '../services/soundEffects';

export default function RealWorldAR({ onExitAR, onEntityPlaced }) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const arManagerRef = useRef(null);

  const [surfaceDetected, setSurfaceDetected] = useState(false);
  const [placedCount, setPlacedCount] = useState(0);
  const [confirmationNotice, setConfirmationNotice] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const noticeTimerRef = useRef(null);

  // Handle explicit placement button or XR tap
  const handlePlaceEntity = useCallback(() => {
    if (!arManagerRef.current) return;

    soundEffects.playAnomalySpawn();
    const placed = arManagerRef.current.placeEntityAtCurrentReticle();

    if (placed) {
      // Trigger short VEIL-style confirmation
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      setConfirmationNotice('ENTITY MANIFESTED // POSITION LOCKED IN REAL SPACE');
      noticeTimerRef.current = setTimeout(() => {
        setConfirmationNotice(null);
      }, 3500);
    }
  }, []);

  // Handle exit
  const handleExit = useCallback(() => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    if (arManagerRef.current) {
      arManagerRef.current.endSession();
    } else {
      onExitAR();
    }
  }, [onExitAR]);

  useEffect(() => {
    if (!containerRef.current || !overlayRef.current) return;

    const manager = new ARManager({
      canvasContainer: containerRef.current,
      domOverlayRoot: overlayRef.current,
      onSurfaceStateChange: (hasSurface) => {
        setSurfaceDetected(hasSurface);
      },
      onEntityPlaced: (count) => {
        setPlacedCount(count);
        if (onEntityPlaced) onEntityPlaced();
      },
      onError: (msg) => {
        setErrorMessage(msg);
      },
      onSessionEnded: () => {
        onExitAR();
      },
    });

    arManagerRef.current = manager;
    manager.startSession();

    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      if (arManagerRef.current) {
        arManagerRef.current.cleanup();
        arManagerRef.current = null;
      }
    };
  }, [onEntityPlaced, onExitAR]);

  return (
    <div className="real-world-ar-container">
      {/* Three.js Canvas Holder */}
      <div ref={containerRef} className="webxr-canvas-holder" />

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
          ) : confirmationNotice ? (
            <div className="ar-confirmation-banner">
              <span className="ar-confirm-tag">⚠ ANOMALY DETECTED</span>
              <span className="ar-confirm-text">{confirmationNotice}</span>
            </div>
          ) : (
            <div className="ar-status-banner">
              {surfaceDetected ? (
                <span className="ar-blink-text">
                  SURFACE DETECTED // TAP SCREEN OR BUTTON TO PLACE ENTITY
                </span>
              ) : (
                <span>POINT CAMERA SLOWLY TOWARD FLOOR OR TABLE...</span>
              )}
            </div>
          )}
        </div>

        {/* Bottom Placement Controls & Telemetry */}
        {!errorMessage && (
          <footer className="ar-bottom-panel">
            {/* Real AR Placement Button */}
            <button
              id="ar-place-button"
              className={`ar-placement-btn ${surfaceDetected ? 'active' : 'disabled'}`}
              onClick={handlePlaceEntity}
              disabled={!surfaceDetected}
              title={surfaceDetected ? 'Anchor entity to detected surface' : 'Scan for floor/surface first'}
            >
              <span className="ar-btn-icon">⚡</span>
              <span className="ar-btn-label">
                {surfaceDetected ? 'MANIFEST ENTITY ON SURFACE' : 'SCANNING FOR SURFACE...'}
              </span>
            </button>

            {/* AR Telemetry Readouts */}
            <div className="ar-bottom-telemetry">
              <div className="ar-telemetry-row">
                <span className="ar-dim">SURFACE TRACKING:</span>
                <span className={`ar-highlight ${surfaceDetected ? 'locked' : ''}`}>
                  {surfaceDetected ? 'PLANE LOCKED (HIT-TEST OK)' : 'SEARCHING PLANE'}
                </span>
              </div>
              <div className="ar-telemetry-row">
                <span className="ar-dim">MANIFESTED ENTITIES:</span>
                <span className="ar-highlight">
                  {placedCount > 0 ? `${placedCount} ANCHORED (THE LURKER)` : '0 DETECTED'}
                </span>
              </div>
              <div className="ar-instructions">
                {placedCount > 0
                  ? 'Entities stay pinned to physical coordinates. Walk around them in your room.'
                  : 'Tap screen or press button when reticle aligns with floor to anchor a 3D entity.'}
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
