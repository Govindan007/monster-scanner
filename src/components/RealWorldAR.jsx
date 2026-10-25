import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ARManager, EncounterState } from '../ar/ARManager';
import { soundEffects } from '../services/soundEffects';
import { getEntityById, getDefaultEntity } from '../ar/entities/EntityRegistry';
import { recordEntityDiscovery } from '../services/discoveryStorage';
import { getUnreviewedEvidenceCount } from '../services/investigationStorage';
import EntitySelector from './EntitySelector';
import InvestigationJournal from './InvestigationJournal';
import AnomalyRadarModal from './AnomalyRadarModal';
import HorrorAtmosphereOverlay from './HorrorAtmosphereOverlay';
import HorrorSettingsModal from './HorrorSettingsModal';

export default function RealWorldAR({
  onExitAR,
  onEntityPlaced,
  onEncounterRecorded,
  initialEntityId = 'the-watcher',
}) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const arManagerRef = useRef(null);

  // Active Entity Selection & Modal
  const [selectedEntity, setSelectedEntity] = useState(() => getEntityById(initialEntityId) || getDefaultEntity());
  const [showSelector, setShowSelector] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [unreviewedCount, setUnreviewedCount] = useState(() => getUnreviewedEvidenceCount());

  // Surface & Placement state
  const [surfaceDetected, setSurfaceDetected] = useState(false);
  const [placedCount, setPlacedCount] = useState(0);
  const [confirmationNotice, setConfirmationNotice] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Phase 4 Encounter Director State
  const [encounterState, setEncounterState] = useState(EncounterState.DORMANT);

  // Temporary Real-time AR Diagnostics (Requirement 6)
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [arDiagnostics, setArDiagnostics] = useState({
    xrSupported: true,
    sessionActive: false,
    loopRunning: false,
    frameCount: 0,
    hitSourceReady: false,
    surfaceDetected: false,
    hitCount: 0,
    sceneEntityCount: 0,
    selectedEntity: selectedEntity.name,
    entityLoaded: true,
    entityInScene: false,
    placementCommitted: false,
    committedPose: null,
    encounterState: EncounterState.DORMANT,
    distanceToEntity: null,
    lastPose: null,
    lastError: null,
  });

  // Scanning interaction state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState(null);
  const [scanGlitch, setScanGlitch] = useState(false);

  const noticeTimerRef = useRef(null);

  // Synchronized callback refs so prop updates do not re-trigger session initialization
  const onExitARRef = useRef(onExitAR);
  const onEntityPlacedRef = useRef(onEntityPlaced);
  const onEncounterRecordedRef = useRef(onEncounterRecorded);

  useEffect(() => {
    onExitARRef.current = onExitAR;
    onEntityPlacedRef.current = onEntityPlaced;
    onEncounterRecordedRef.current = onEncounterRecorded;
  });

  // Handle entity selection change
  const handleSelectEntity = useCallback((entity) => {
    setSelectedEntity(entity);
    setShowSelector(false);
    if (arManagerRef.current) {
      arManagerRef.current.setSelectedEntity(entity);
    }
    setConfirmationNotice(`TARGET LOCKED: ${entity.name} (${entity.code})`);
    setTimeout(() => setConfirmationNotice(null), 2500);
  }, []);

  // Handle explicit placement button or XR tap
  const handlePlaceEntity = useCallback(() => {
    if (!arManagerRef.current || isScanning || encounterState !== EncounterState.DORMANT) return;

    soundEffects.playAnomalySpawn();
    const result = arManagerRef.current.placeEntityAtCurrentReticle(selectedEntity);

    if (result && result.success) {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      setConfirmationNotice(`${selectedEntity.name} MANIFESTED // POSITION LOCKED IN REAL SPACE`);
      noticeTimerRef.current = setTimeout(() => {
        setConfirmationNotice(null);
      }, 3500);
    } else {
      soundEffects.playButtonBeep(320, 0.12);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      setConfirmationNotice('NO SURFACE DETECTED YET // POINT CAMERA TOWARD FLOOR OR TABLE');
      noticeTimerRef.current = setTimeout(() => {
        setConfirmationNotice(null);
      }, 3500);
    }
  }, [isScanning, encounterState, selectedEntity]);

  // Handle scanning interaction through EncounterDirector
  const handleStartScan = useCallback(() => {
    if (placedCount === 0 || isScanning || !arManagerRef.current) return;

    setIsScanning(true);
    setScanProgress(0);
    setScanResult(null);
    soundEffects.playRadarPulse();

    const scanInfo = arManagerRef.current.scanPlacedEntities({
      onProgress: (prog) => {
        setScanProgress(prog);
      },
      onComplete: (res) => {
        setIsScanning(false);
        setScanResult(res);
        setScanGlitch(true);
        setTimeout(() => setScanGlitch(false), 450);

        // Persist discovery record
        if (res && res.id) {
          recordEntityDiscovery(res.id, {
            name: res.name,
            code: res.code,
            threat: res.threat,
            resonance: res.resonance,
          });
        }

        if (onEncounterRecordedRef.current) {
          onEncounterRecordedRef.current(res);
        }
      },
      onFail: ({ outcome, reason }) => {
        setIsScanning(false);
        soundEffects.playAnomalyLost();
        setConfirmationNotice(`⚠ SCAN ABORTED: ${reason || outcome}`);
        setTimeout(() => setConfirmationNotice(null), 3500);
      },
    });

    if (!scanInfo) {
      setIsScanning(false);
    }
  }, [isScanning, placedCount]);

  // Handle cancelling active scan
  const handleCancelScan = useCallback(() => {
    if (!arManagerRef.current || !isScanning) return;
    arManagerRef.current.cancelScan('USER_CANCELLED');
    setIsScanning(false);
    setScanProgress(0);
    soundEffects.playButtonBeep(400, 0.1);
    setConfirmationNotice('SCAN MANUALLY CANCELLED');
    setTimeout(() => setConfirmationNotice(null), 2500);
  }, [isScanning]);

  // Handle purging / dissolving the placed entity
  const handlePurgeEntity = useCallback(() => {
    if (!arManagerRef.current || isScanning) return;
    soundEffects.playAnomalyLost();

    arManagerRef.current.purgePlacedEntities(() => {
      setPlacedCount(0);
      setScanResult(null);
      setEncounterState(EncounterState.DORMANT);
      setConfirmationNotice('ENTITY ENCOUNTER CONCLUDED // REALITY RE-STABILIZED');
      setTimeout(() => setConfirmationNotice(null), 3000);
    });
  }, [isScanning]);

  // Handle targeting an anomaly from the radar in AR
  const handleEngageFromRadar = useCallback((anomaly) => {
    const targetEntity = getEntityById(anomaly.entityId);
    if (targetEntity) {
      setSelectedEntity(targetEntity);
      if (arManagerRef.current) {
        arManagerRef.current.setSelectedEntity(targetEntity);
      }
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      setConfirmationNotice(`${anomaly.title} LOCKED // AIM AT FLOOR & TAP TO MANIFEST`);
      noticeTimerRef.current = setTimeout(() => {
        setConfirmationNotice(null);
      }, 4000);
    }
  }, []);

  // Handle exit
  const handleExit = useCallback(() => {
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
      onDiagnostics: (data) => {
        if (isMounted) setArDiagnostics(data);
      },
      onEncounterStateChange: (newState) => {
        if (isMounted) {
          setEncounterState(newState);
          soundEffects.playEncounterStateCue(newState);
          if (newState === EncounterState.DISTURBED) {
            setScanGlitch(true);
            setTimeout(() => setScanGlitch(false), 350);
          }
        }
      },
      onScanProgress: (prog) => {
        if (isMounted) setScanProgress(prog);
      },
      onScanOutcome: (outcome) => {
        if (isMounted && outcome.success) {
          setScanResult(outcome);
          setIsScanning(false);
        }
      },
      onEncounterEscaped: () => {
        if (isMounted) {
          setPlacedCount(0);
          setScanResult(null);
          setIsScanning(false);
          setEncounterState(EncounterState.DORMANT);
        }
      },
      onEvidenceAwarded: (evidence) => {
        if (isMounted) {
          soundEffects.playAnomalyDetected();
          setConfirmationNotice(`NEW EVIDENCE CATALOGED: ${evidence.title.toUpperCase()}`);
          setUnreviewedCount(getUnreviewedEvidenceCount());
          setTimeout(() => setConfirmationNotice(null), 3500);
        }
      },
    });

    arManagerRef.current = manager;
    manager.startSession();

    return () => {
      isMounted = false;
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

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Entity Selector Trigger Button */}
            <button
              id="ar-entity-select-btn"
              className="ar-entity-select-trigger"
              onClick={() => setShowSelector(true)}
              title="Select Active Anomaly Entity"
              disabled={isScanning || placedCount > 0}
            >
              <span className="ar-entity-select-icon">◈</span>
              <span className="ar-entity-select-name">{selectedEntity.name}</span>
              <span className="ar-entity-select-arrow">▾</span>
            </button>

            {/* Investigation Journal Button */}
            <button
              id="ar-journal-btn"
              className="ar-journal-trigger-btn"
              onClick={() => {
                soundEffects.playButtonBeep(520, 0.05);
                setShowJournal(true);
              }}
              title="Open Paranormal Investigation Journal & Dossiers"
            >
              <span>📁 JOURNAL</span>
              {unreviewedCount > 0 && (
                <span className="ar-journal-badge">{unreviewedCount}</span>
              )}
            </button>

            {/* Anomaly Radar Button */}
            <button
              id="ar-radar-btn"
              className="ar-journal-trigger-btn"
              onClick={() => {
                soundEffects.playButtonBeep(640, 0.06);
                setShowRadar(true);
              }}
              title="Open Optical Anomaly Radar Matrix"
            >
              <span>📡 RADAR</span>
            </button>

            {/* Immersion & Audio Settings Button */}
            <button
              id="ar-settings-btn"
              className="ar-journal-trigger-btn"
              onClick={() => {
                soundEffects.playButtonBeep(520, 0.05);
                setShowSettings(true);
              }}
              title="Immersion, Audio & Horror Settings"
            >
              <span>⚙</span>
            </button>

            <button
              className={`ar-diag-toggle-btn ${showDiagnostics ? 'active' : ''}`}
              onClick={() => setShowDiagnostics((prev) => !prev)}
              title="Toggle AR Hardware Diagnostics"
            >
              {showDiagnostics ? '⚡ DIAG: ON' : '⚙ DIAG'}
            </button>
            <button className="ar-exit-button" onClick={handleExit}>
              ✕ EXIT AR
            </button>
          </div>
        </header>

        {/* Temporary AR Mobile Diagnostics Panel (Requirement 6) */}
        {showDiagnostics && (
          <div className="ar-diag-panel">
            <div className="ar-diag-title">
              <span>AR HARDWARE TELEMETRY</span>
              <button
                className="ar-diag-close"
                onClick={() => setShowDiagnostics(false)}
              >
                ✕
              </button>
            </div>
            <div className="ar-diag-grid">
              <div className="ar-diag-row">
                <span className="ar-diag-label">WEBXR SUPPORT:</span>
                <span className="diag-ok">SUPPORTED (immersive-ar)</span>
              </div>
              <div className="ar-diag-row">
                <span className="ar-diag-label">SESSION STATE:</span>
                <span className={arDiagnostics.sessionActive ? 'diag-ok' : 'diag-err'}>
                  {arDiagnostics.sessionActive ? 'ACTIVE (IMMERSIVE-AR)' : 'INACTIVE'}
                </span>
              </div>
              <div className="ar-diag-row">
                <span className="ar-diag-label">XR RENDER LOOP:</span>
                <span className={arDiagnostics.loopRunning ? 'diag-ok' : 'diag-warn'}>
                  {arDiagnostics.loopRunning
                    ? `RUNNING (f: ${arDiagnostics.frameCount})`
                    : 'STOPPED'}
                </span>
              </div>
              <div className="ar-diag-row">
                <span className="ar-diag-label">HIT-TEST SOURCE:</span>
                <span className={arDiagnostics.hitSourceReady ? 'diag-ok' : 'diag-warn'}>
                  {arDiagnostics.hitSourceReady ? 'READY (VIEWER RAY)' : 'INITIALIZING'}
                </span>
              </div>
              <div className="ar-diag-row">
                <span className="ar-diag-label">SURFACE (RETICLE):</span>
                <span className={arDiagnostics.surfaceDetected ? 'diag-ok' : 'diag-warn'}>
                  {arDiagnostics.surfaceDetected
                    ? `DETECTED (hits: ${arDiagnostics.hitCount})`
                    : 'SEARCHING FLOOR/TABLE...'}
                </span>
              </div>
              <div className="ar-diag-row">
                <span className="ar-diag-label">ACTIVE ENTITY:</span>
                <span className="diag-ok">{selectedEntity.name} ({selectedEntity.classification})</span>
              </div>
              <div className="ar-diag-row">
                <span className="ar-diag-label">SCENE STATUS:</span>
                <span className={arDiagnostics.entityInScene ? 'diag-ok' : 'diag-neutral'}>
                  {arDiagnostics.entityInScene
                    ? `IN SCENE (${arDiagnostics.sceneEntityCount} ANCHORED)`
                    : 'LOADED (READY TO PLACE)'}
                </span>
              </div>
              <div className="ar-diag-row">
                <span className="ar-diag-label">COMMITTED POSE:</span>
                <span className={arDiagnostics.committedPose ? 'diag-ok' : 'diag-neutral'}>
                  {arDiagnostics.committedPose
                    ? `X:${arDiagnostics.committedPose.x} Y:${arDiagnostics.committedPose.y} Z:${arDiagnostics.committedPose.z}`
                    : 'PENDING PLACEMENT'}
                </span>
              </div>
              <div className="ar-diag-row">
                <span className="ar-diag-label">ENCOUNTER STATE:</span>
                <span className="diag-ok">{arDiagnostics.encounterState || encounterState}</span>
              </div>
              <div className="ar-diag-row">
                <span className="ar-diag-label">ENTITY DISTANCE:</span>
                <span className={arDiagnostics.distanceToEntity ? 'diag-ok' : 'diag-neutral'}>
                  {arDiagnostics.distanceToEntity ? `${arDiagnostics.distanceToEntity}m` : 'N/A'}
                </span>
              </div>
              <div className="ar-diag-row">
                <span className="ar-diag-label">RETICLE HIT POSE:</span>
                <span className={arDiagnostics.lastPose ? 'diag-ok' : 'diag-neutral'}>
                  {arDiagnostics.lastPose
                    ? `X:${arDiagnostics.lastPose.x} Y:${arDiagnostics.lastPose.y} Z:${arDiagnostics.lastPose.z}`
                    : 'NONE'}
                </span>
              </div>
              <div className="ar-diag-row">
                <span className="ar-diag-label">HARDWARE ERRORS:</span>
                <span className={arDiagnostics.lastError ? 'diag-err' : 'diag-ok'}>
                  {arDiagnostics.lastError || 'NONE (HEALTHY)'}
                </span>
              </div>
            </div>
          </div>
        )}

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
              <button
                className="ar-cancel-scan-action-btn"
                onClick={handleCancelScan}
                title="Cancel scan analysis"
              >
                ✕ ABORT SCAN
              </button>
            </div>
          ) : scanResult ? (
            /* Scan Identification Result Card */
            <div className="ar-scan-result-card">
              <div className="ar-result-tag">⚠ ANOMALY RESOLVED // THREAT RECORDED</div>
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
                STATUS: {scanResult.behaviorSummary || 'ENTITY CATALOGUED IN DISCOVERY PERSISTENCE.'}
              </div>
            </div>
          ) : confirmationNotice ? (
            <div className="ar-confirmation-banner">
              <span className="ar-confirm-tag">⚠ ANOMALY ALERT</span>
              <span className="ar-confirm-text">{confirmationNotice}</span>
            </div>
          ) : (
            <div className="ar-status-banner">
              {encounterState === EncounterState.APPEARING ? (
                <span className="ar-blink-text">
                  DIMENSIONAL BREACH // MANIFESTING {selectedEntity.name.toUpperCase()}...
                </span>
              ) : encounterState === EncounterState.DISTURBED ? (
                <span className="ar-alert-text">
                  ⚠ {selectedEntity.name.toUpperCase()} DISTURBED // PSYCHIC FLUX SURGING
                </span>
              ) : encounterState === EncounterState.OBSERVING ? (
                <span className="ar-locked-text">
                  {selectedEntity.name} ACTIVE // MAINTAIN DISTANCE (0.8m - 3.5m)
                </span>
              ) : encounterState === EncounterState.ESCAPING ? (
                <span className="ar-dim-text">
                  ENTITY DISPERSING // REALITY STABILIZING...
                </span>
              ) : surfaceDetected ? (
                <span className="ar-blink-text">
                  SURFACE DETECTED // TAP SCREEN OR BUTTON TO PLACE {selectedEntity.name.toUpperCase()}
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
              {placedCount === 0 || encounterState === EncounterState.DORMANT ? (
                /* Placement Button */
                <button
                  id="ar-place-button"
                  className={`ar-placement-btn ${surfaceDetected ? 'active' : 'disabled'}`}
                  onClick={handlePlaceEntity}
                  disabled={!surfaceDetected || encounterState !== EncounterState.DORMANT}
                  title={surfaceDetected ? `Anchor ${selectedEntity.name} to detected surface` : 'Scan for floor/surface first'}
                >
                  <span className="ar-btn-icon">⚡</span>
                  <span className="ar-btn-label">
                    {surfaceDetected ? `MANIFEST ${selectedEntity.name.toUpperCase()}` : 'SCANNING FOR SURFACE...'}
                  </span>
                </button>
              ) : (
                /* Post-placement options: Scan or Disperse */
                <div className="ar-encounter-controls">
                  <button
                    id="ar-scan-button"
                    className="action-btn scan-pulse-btn ar-active-scan-btn"
                    onClick={handleStartScan}
                    disabled={isScanning || encounterState === EncounterState.APPEARING || encounterState === EncounterState.ESCAPING}
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
                    disabled={isScanning || encounterState === EncounterState.ESCAPING}
                    title={`Dissolve and conclude encounter with ${selectedEntity.name}`}
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
                <span className="ar-dim">ENCOUNTER STATE:</span>
                <span className="ar-highlight">
                  {encounterState} {arDiagnostics.distanceToEntity ? `[${arDiagnostics.distanceToEntity}m]` : ''}
                </span>
              </div>
              <div className="ar-instructions">
                {placedCount > 0
                  ? `Walk around ${selectedEntity.name}. Distance must stay between 0.8m and 3.5m during scan.`
                  : 'Move phone across floor or table until the red reticle locks onto a plane.'}
              </div>
            </div>
          </footer>
        )}

        {/* Manual Entity Selector Modal */}
        <EntitySelector
          isOpen={showSelector}
          selectedEntityId={selectedEntity.id}
          onSelectEntity={handleSelectEntity}
          onClose={() => setShowSelector(false)}
        />

        {/* Paranormal Investigation Journal & Dossiers Modal */}
        <InvestigationJournal
          isOpen={showJournal}
          onClose={() => {
            setShowJournal(false);
            setUnreviewedCount(getUnreviewedEvidenceCount());
          }}
        />

        {/* Optical Anomaly Radar Modal */}
        <AnomalyRadarModal
          isOpen={showRadar}
          onClose={() => setShowRadar(false)}
          onEngageAnomaly={handleEngageFromRadar}
        />

        {/* Phase 7: Horror Atmosphere & Suspense Overlay in AR */}
        <HorrorAtmosphereOverlay
          encounterState={encounterState}
          isScanning={isScanning}
          activeEntityId={selectedEntity.id}
        />

        {/* Phase 7: Immersion & Audio Settings Modal */}
        <HorrorSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    </div>
  );
}
