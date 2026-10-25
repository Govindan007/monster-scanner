import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getRadarSettings,
  saveRadarSettings,
  isGeolocationAvailable,
  requestCurrentPosition,
  startLocationWatch,
  stopLocationWatch,
  getEvaluatedAnomalies,
  recordAnomalyEngagement,
  triggerSignalHaptic,
  DEFAULT_SIMULATED_ORIGIN,
} from '../services/locationRadarService';
import { soundEffects } from '../services/soundEffects';
import CreatureSilhouette from './CreatureSilhouette';

export default function AnomalyRadarModal({
  isOpen,
  onClose,
  onEngageAnomaly,
}) {
  const [settings, setSettings] = useState(() => getRadarSettings());
  const [userLocation, setUserLocation] = useState(DEFAULT_SIMULATED_ORIGIN);
  const [gpsStatus, setGpsStatus] = useState('UNINITIALIZED'); // 'UNINITIALIZED' | 'ACQUIRING' | 'ACTIVE' | 'DENIED' | 'UNSUPPORTED' | 'SIMULATED'
  const [gpsErrorMsg, setGpsErrorMsg] = useState(null);
  const [simulationOffset, setSimulationOffset] = useState(() => settings.simulationOffsetMeters || 0);
  const [selectedAnomalyId, setSelectedAnomalyId] = useState('ano-watcher-01');

  // Canvas radar ref
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const sweepAngleRef = useRef(0);
  const lastSweepPingRef = useRef(0);
  const soundBeepTimerRef = useRef(null);

  // Load and apply settings
  const handleToggleLocation = async () => {
    if (settings.locationEnabled) {
      stopLocationWatch();
      const updated = saveRadarSettings({ locationEnabled: false });
      setSettings(updated);
      setUserLocation(DEFAULT_SIMULATED_ORIGIN);
      setGpsStatus('SIMULATED');
      setGpsErrorMsg(null);
      soundEffects.playButtonBeep(380, 0.08);
    } else {
      if (!isGeolocationAvailable()) {
        setGpsStatus('UNSUPPORTED');
        setGpsErrorMsg('Browser geolocation not supported on this device.');
        soundEffects.playButtonBeep(260, 0.15);
        return;
      }

      setGpsStatus('ACQUIRING');
      setGpsErrorMsg(null);
      soundEffects.playRadarPulse();

      try {
        const initialPos = await requestCurrentPosition();
        setUserLocation(initialPos);
        const updated = saveRadarSettings({ locationEnabled: true });
        setSettings(updated);
        setGpsStatus('ACTIVE');

        startLocationWatch(
          (pos) => {
            setUserLocation(pos);
            setGpsStatus('ACTIVE');
          },
          (err) => {
            console.warn('[VEIL Radar] Watch error:', err);
          }
        );
      } catch (err) {
        console.warn('[VEIL Radar] Permission error:', err);
        setGpsStatus('DENIED');
        setGpsErrorMsg(
          err.code === 1
            ? 'Location access denied. Use indoor simulator to test radar.'
            : 'Unable to acquire satellite fix. Using virtual local baseline.'
        );
        soundEffects.playButtonBeep(260, 0.15);
      }
    }
  };

  const handleToggleHaptics = () => {
    const next = !settings.hapticsEnabled;
    const updated = saveRadarSettings({ hapticsEnabled: next });
    setSettings(updated);
    if (next) {
      triggerSignalHaptic(80, true);
    }
    soundEffects.playButtonBeep(520, 0.05);
  };

  const handleToggleAudio = () => {
    const next = !settings.radarAudioEnabled;
    const updated = saveRadarSettings({ radarAudioEnabled: next });
    setSettings(updated);
    soundEffects.playButtonBeep(next ? 660 : 330, 0.05);
  };

  // Evaluate anomalies with current coordinates & manual test offset
  const anomalies = getEvaluatedAnomalies(userLocation, simulationOffset);
  const selectedAnomaly = anomalies.find((a) => a.id === selectedAnomalyId) || anomalies[0];

  // Radar Proximity Beep & Haptic Loop
  useEffect(() => {
    if (!isOpen) return;

    if (soundBeepTimerRef.current) clearInterval(soundBeepTimerRef.current);

    if (selectedAnomaly) {
      const interval = Math.max(280, 1600 - (selectedAnomaly.signalPct || 0) * 13);
      soundBeepTimerRef.current = setInterval(() => {
        if (settings.radarAudioEnabled && selectedAnomaly.signalPct > 5) {
          soundEffects.playSignalBeep(selectedAnomaly.signalPct);
        }
        if (settings.hapticsEnabled && selectedAnomaly.signalPct > 15) {
          triggerSignalHaptic(selectedAnomaly.signalPct, true);
        }
      }, interval);
    }

    return () => {
      if (soundBeepTimerRef.current) clearInterval(soundBeepTimerRef.current);
    };
  }, [isOpen, selectedAnomaly, settings.radarAudioEnabled, settings.hapticsEnabled]);

  // Radar Canvas Sweep Render Loop
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(centerX, centerY) - 12;

      // Clear with dark HUD background
      ctx.clearRect(0, 0, width, height);

      // Radial dark background
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius);
      bgGrad.addColorStop(0, 'rgba(6, 16, 26, 0.96)');
      bgGrad.addColorStop(1, 'rgba(4, 8, 14, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Range rings (35m, 70m, 105m, 140m)
      const rings = [0.25, 0.5, 0.75, 1.0];
      const ringMeters = ['35m', '70m', '105m', '140m'];

      rings.forEach((rScale, idx) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * rScale, 0, Math.PI * 2);
        ctx.strokeStyle = idx === 0 ? 'rgba(0, 229, 255, 0.35)' : 'rgba(0, 229, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash(idx === 0 ? [3, 3] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ring labels
        ctx.fillStyle = idx === 0 ? 'rgba(0, 229, 255, 0.65)' : 'rgba(148, 163, 184, 0.45)';
        ctx.font = '8px monospace';
        ctx.fillText(ringMeters[idx], centerX + 4, centerY - radius * rScale + 9);
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY + radius);
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cardinal direction indicators
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N', centerX, centerY - radius + 11);
      ctx.fillText('S', centerX, centerY + radius - 4);
      ctx.fillText('E', centerX + radius - 8, centerY + 3);
      ctx.fillText('W', centerX - radius + 8, centerY + 3);

      // Radar Sweep Angle update (1.8 radians/sec)
      sweepAngleRef.current = (sweepAngleRef.current + 0.035) % (Math.PI * 2);
      const angle = sweepAngleRef.current;

      // Play sweep ping at North
      const now = Date.now();
      if (angle < 0.05 && now - lastSweepPingRef.current > 1800) {
        lastSweepPingRef.current = now;
        if (settings.radarAudioEnabled) {
          soundEffects.playRadarSweepPing();
        }
      }

      // Draw sweeping cone gradient
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle - 0.45, angle);
      ctx.closePath();
      const sweepGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      sweepGrad.addColorStop(0, 'rgba(0, 229, 255, 0.32)');
      sweepGrad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Leading bright sweep line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Plot Anomaly Blips
      const maxRadarDistance = 160;
      anomalies.forEach((ano) => {
        const rad = ((ano.bearing - 90) * Math.PI) / 180;
        const normDist = Math.min(ano.distanceMeters, maxRadarDistance) / maxRadarDistance;
        const blipDist = normDist * radius;
        const blipX = centerX + Math.cos(rad) * blipDist;
        const blipY = centerY + Math.sin(rad) * blipDist;

        const isSelected = ano.id === selectedAnomalyId;
        const inRange = ano.inRange;

        // Blip color by entity theme
        let blipColor = '#00e5ff';
        if (ano.entityId === 'the-drifter') blipColor = '#c084fc';
        if (ano.entityId === 'the-crawler') blipColor = '#f59e0b';
        if (inRange) blipColor = '#10b981';

        // Outer pulse ring if in encounter range
        if (inRange) {
          ctx.beginPath();
          ctx.arc(blipX, blipY, 10 + Math.sin(now / 150) * 3, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Selection ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(blipX, blipY, 8, 0, Math.PI * 2);
          ctx.strokeStyle = '#f1f5f9';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Center Blip Node
        ctx.beginPath();
        ctx.arc(blipX, blipY, isSelected ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = blipColor;
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Designation tag
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(241, 245, 249, 0.75)';
        ctx.font = '7.5px monospace';
        ctx.fillText(ano.designation, blipX, blipY + 12);
      });

      // Player Center Dot
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, anomalies, selectedAnomalyId, settings.radarAudioEnabled]);

  // Handle Engage Button Click
  const handleEngage = useCallback(() => {
    if (!selectedAnomaly || !selectedAnomaly.canEngage) return;

    soundEffects.playAnomalySpawn();
    recordAnomalyEngagement(selectedAnomaly.id);

    if (onEngageAnomaly) {
      onEngageAnomaly(selectedAnomaly);
    }
    onClose();
  }, [selectedAnomaly, onEngageAnomaly, onClose]);

  // Quick simulation controls for testing
  const handleApproachBy = (delta) => {
    const next = Math.max(0, simulationOffset + delta);
    setSimulationOffset(next);
    saveRadarSettings({ simulationOffsetMeters: next });
    soundEffects.playButtonBeep(delta > 0 ? 600 : 400, 0.05);
  };

  const handleResetSimulation = () => {
    setSimulationOffset(0);
    saveRadarSettings({ simulationOffsetMeters: 0 });
    soundEffects.playButtonBeep(350, 0.08);
  };

  if (!isOpen) return null;

  return (
    <div
      className="radar-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Optical Anomaly Radar Matrix"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="radar-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header Bar */}
        <header className="radar-modal-header">
          <div className="radar-header-title">
            <span className="radar-header-badge">1420.4 MHz // {gpsStatus} // RIFT MAPPING</span>
            <h2 className="radar-title-text">ANOMALY RADAR MATRIX</h2>
          </div>

          <div className="radar-toggles-cluster">
            <button
              type="button"
              className={`radar-chip-toggle ${settings.locationEnabled ? 'active' : ''}`}
              onClick={handleToggleLocation}
              title="Toggle Live GPS vs Virtual Grid"
            >
              {settings.locationEnabled ? '📍 GPS: ON' : '📍 GPS: OFF'}
            </button>
            <button
              type="button"
              className={`radar-chip-toggle ${settings.hapticsEnabled ? 'active' : ''}`}
              onClick={handleToggleHaptics}
              title="Toggle Haptic Proximity Vibration"
            >
              {settings.hapticsEnabled ? '📳 HAPTICS' : '📳 OFF'}
            </button>
            <button
              type="button"
              className={`radar-chip-toggle ${settings.radarAudioEnabled ? 'active' : ''}`}
              onClick={handleToggleAudio}
              title="Toggle Radar Sweep Audio"
            >
              {settings.radarAudioEnabled ? '🔊 SFX' : '🔇 OFF'}
            </button>
            <button
              type="button"
              className="radar-close-icon-btn"
              onClick={onClose}
              title="Close Radar"
            >
              ✕
            </button>
          </div>
        </header>

        {/* GPS Warning Banner if any */}
        {gpsErrorMsg && (
          <div className="radar-error-callout" role="alert">
            <span>⚠ {gpsErrorMsg}</span>
          </div>
        )}

        <div className="radar-body-scrollable">
          {/* Main Visual Radar Display Area */}
          <div className="radar-scope-wrapper">
            <div className="radar-canvas-housing">
              <canvas
                ref={canvasRef}
                width={260}
                height={260}
                className="radar-canvas"
              />
              <div className="radar-scope-telemetry">
                <span>ORIGIN: {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}</span>
                <span>{settings.locationEnabled ? `GPS: ±${Math.round(userLocation.accuracy)}m` : 'VIRTUAL GRID'}</span>
              </div>
            </div>

            {/* Anomaly Quick Target Chips */}
            <div className="radar-targets-row" role="tablist">
              {anomalies.map((ano) => (
                <button
                  key={ano.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedAnomalyId === ano.id}
                  className={`radar-target-pill ${selectedAnomalyId === ano.id ? 'active' : ''} ${ano.inRange ? 'in-range' : ''}`}
                  onClick={() => {
                    setSelectedAnomalyId(ano.id);
                    soundEffects.playButtonBeep(480, 0.04);
                  }}
                >
                  <span className="target-pill-code">{ano.designation}</span>
                  <span className="target-pill-dist">{ano.distanceMeters}m</span>
                  {ano.inRange && <span className="target-pill-dot">●</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Anomaly Tactical Dossier Panel */}
          <section className="radar-target-dossier" aria-label="Target Telemetry">
            <div className="target-card-top">
              <div className="target-thumbnail-box">
                <CreatureSilhouette
                  entityId={selectedAnomaly.entityId}
                  size="small"
                  animate={true}
                />
              </div>

              <div className="target-specs-box">
                <div className="target-code-header">
                  <span className="target-code-tag">{selectedAnomaly.designation}</span>
                  <span className={`target-threat-pill threat-${selectedAnomaly.threat?.toLowerCase()}`}>
                    {selectedAnomaly.threat}
                  </span>
                </div>
                <h3 className="target-entity-title">{selectedAnomaly.title}</h3>
                <span className="target-freq-tag">{selectedAnomaly.resonance}</span>
              </div>
            </div>

            {/* Signal Resonance Meter */}
            <div className="target-signal-meter-card">
              <div className="meter-header-row">
                <span className="meter-label">SIGNAL RESONANCE</span>
                <span className="meter-val-mono">
                  {selectedAnomaly.signalPct}% ({selectedAnomaly.dbm} dBm)
                </span>
              </div>

              <div className="meter-bar-track">
                <div
                  className="meter-bar-fill"
                  style={{
                    width: `${selectedAnomaly.signalPct}%`,
                    backgroundColor: selectedAnomaly.inRange ? '#10b981' : '#00e5ff',
                  }}
                ></div>
              </div>

              <div className="meter-metrics-grid">
                <div className="metric-cell">
                  <span className="cell-k">DISTANCE:</span>
                  <span className={`cell-v ${selectedAnomaly.inRange ? 'highlight-green' : ''}`}>
                    {selectedAnomaly.distanceMeters}m
                  </span>
                </div>
                <div className="metric-cell">
                  <span className="cell-k">BEARING:</span>
                  <span className="cell-v">{selectedAnomaly.bearing}°</span>
                </div>
                <div className="metric-cell">
                  <span className="cell-k">THRESHOLD:</span>
                  <span className="cell-v">&lt; {selectedAnomaly.encounterRadius}m</span>
                </div>
              </div>
            </div>

            {/* Target Description */}
            <p className="target-lore-text">{selectedAnomaly.description}</p>

            {/* Action Engagement Button & Status */}
            <div className="radar-engage-action-block">
              {selectedAnomaly.isCoolingDown ? (
                <div className="engage-status-pill cooldown">
                  <span>⏳ RIFT DISPERSED // COOLING DOWN ({selectedAnomaly.cooldownRemainingSec}s)</span>
                </div>
              ) : selectedAnomaly.inRange ? (
                <div className="engage-status-pill ready">
                  <span>⚡ MANIFESTATION THRESHOLD REACHED</span>
                </div>
              ) : (
                <div className="engage-status-pill out-of-range">
                  <span>📡 APPROACH WITHIN {selectedAnomaly.encounterRadius}m TO ENGAGE</span>
                </div>
              )}

              <button
                type="button"
                id="radar-engage-btn"
                className={`radar-primary-engage-btn ${selectedAnomaly.canEngage ? 'can-engage' : 'disabled'}`}
                disabled={!selectedAnomaly.canEngage}
                onClick={handleEngage}
              >
                {selectedAnomaly.canEngage
                  ? '⚡ ENGAGE ANOMALY VIA AR'
                  : selectedAnomaly.isCoolingDown
                  ? `COOLING DOWN (${selectedAnomaly.cooldownRemainingSec}s)`
                  : `APPROACH TARGET (${selectedAnomaly.distanceMeters}m / <${selectedAnomaly.encounterRadius}m)`}
              </button>
            </div>

            {/* Indoor & Desktop Simulation Module */}
            <div className="radar-indoor-simulator">
              <div className="sim-header">
                <span>🕹 PROXIMITY SIMULATOR (TESTING INDOORS)</span>
                <span className="sim-offset-badge">+{simulationOffset}m</span>
              </div>
              <p className="sim-help-text">
                Simulate walking toward target coordinates without leaving your desk:
              </p>
              <div className="sim-controls-row">
                <button
                  type="button"
                  className="sim-chip-btn"
                  onClick={() => handleApproachBy(15)}
                >
                  👟 APPROACH +15m
                </button>
                <button
                  type="button"
                  className="sim-chip-btn"
                  onClick={() => handleApproachBy(-15)}
                  disabled={simulationOffset <= 0}
                >
                  BACK -15m
                </button>
                <button
                  type="button"
                  className="sim-chip-btn reset"
                  onClick={handleResetSimulation}
                  disabled={simulationOffset === 0}
                >
                  RESET
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Legal & Safety Footer Banner */}
        <footer className="radar-modal-footer">
          <div className="safety-statement">
            <span className="statement-icon">⚠</span>
            <span><strong>SAFETY DIRECTIVE:</strong> Remain aware of physical surroundings. Stop walking before entering AR.</span>
          </div>
          <div className="privacy-statement">
            <span><strong>FICTION &amp; PRIVACY:</strong> Virtual entities are fictional game constructs. Coordinates remain on device.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
