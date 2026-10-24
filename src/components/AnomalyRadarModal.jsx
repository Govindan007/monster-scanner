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
      // User is disabling location
      stopLocationWatch();
      const updated = saveRadarSettings({ locationEnabled: false });
      setSettings(updated);
      setUserLocation(DEFAULT_SIMULATED_ORIGIN);
      setGpsStatus('SIMULATED');
      setGpsErrorMsg(null);
      soundEffects.playButtonBeep(380, 0.08);
    } else {
      // User is explicitly opting in to enable location
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

        // Start ongoing watch
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
            ? 'Location access denied. Tap "Simulate Coordinates" to test radar.'
            : 'Unable to acquire satellite fix. Using simulated local baseline.'
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
      // Interval speeds up as player approaches (from 1600ms at distance to 280ms point-blank)
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
      const radius = Math.min(centerX, centerY) - 14;

      // Clear with dark HUD background
      ctx.clearRect(0, 0, width, height);

      // Radial dark gradient background
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius);
      bgGrad.addColorStop(0, 'rgba(0, 24, 38, 0.95)');
      bgGrad.addColorStop(1, 'rgba(2, 8, 14, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Range rings (25m, 50m, 100m, 150m)
      const rings = [0.25, 0.5, 0.75, 1.0];
      const ringMeters = ['35m', '70m', '105m', '140m'];

      rings.forEach((rScale, idx) => {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * rScale, 0, Math.PI * 2);
        ctx.strokeStyle = idx === 0 ? 'rgba(0, 255, 136, 0.35)' : 'rgba(0, 240, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.setLineDash(idx === 0 ? [3, 3] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ring distance labels
        ctx.fillStyle = idx === 0 ? 'rgba(0, 255, 136, 0.65)' : 'rgba(0, 240, 255, 0.45)';
        ctx.font = '8px monospace';
        ctx.fillText(ringMeters[idx], centerX + 4, centerY - radius * rScale + 9);
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY + radius);
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cardinal direction letters
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N', centerX, centerY - radius + 11);
      ctx.fillText('S', centerX, centerY + radius - 4);
      ctx.fillText('E', centerX + radius - 8, centerY + 3);
      ctx.fillText('W', centerX - radius + 8, centerY + 3);

      // Radar Sweep Angle update (1.8 radians/sec)
      sweepAngleRef.current = (sweepAngleRef.current + 0.035) % (Math.PI * 2);
      const angle = sweepAngleRef.current;

      // Play sweep ping at top of circle (North)
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
      sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
      sweepGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Leading bright sweep line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      ctx.strokeStyle = 'rgba(0, 255, 230, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Plot Anomaly Blips
      const maxRadarDistance = 160; // Max display range in meters
      anomalies.forEach((ano) => {
        // Bearing to Cartesian on radar (0 deg = North = -Y)
        const rad = ((ano.bearing - 90) * Math.PI) / 180;
        const normDist = Math.min(ano.distanceMeters, maxRadarDistance) / maxRadarDistance;
        const blipDist = normDist * radius;
        const blipX = centerX + Math.cos(rad) * blipDist;
        const blipY = centerY + Math.sin(rad) * blipDist;

        const isSelected = ano.id === selectedAnomalyId;
        const inRange = ano.inRange;

        // Blip color by entity threat / category
        let blipColor = '#00f0ff';
        if (ano.entityId === 'the-drifter') blipColor = '#c084fc';
        if (ano.entityId === 'the-crawler') blipColor = '#f59e0b';
        if (inRange) blipColor = '#00ff88';

        // Outer pulse circle if in encounter range
        if (inRange) {
          ctx.beginPath();
          ctx.arc(blipX, blipY, 10 + Math.sin(now / 150) * 3, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Selection ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(blipX, blipY, 8, 0, Math.PI * 2);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Center Blip Node
        ctx.beginPath();
        ctx.arc(blipX, blipY, isSelected ? 4.5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = blipColor;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Designation tag
        ctx.fillStyle = isSelected ? '#fff' : 'rgba(255, 255, 255, 0.7)';
        ctx.font = '7.5px monospace';
        ctx.fillText(ano.designation, blipX, blipY + 12);
      });

      // Player Center Marker (Green triangle or dot)
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88';
      ctx.fill();
      ctx.strokeStyle = '#000';
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
      className="radar-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Paranormal Anomaly Radar"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="radar-modal-card">
        {/* Header Bar */}
        <header className="radar-modal-header">
          <div className="radar-title-box">
            <span className="radar-pulse-icon">📡</span>
            <div>
              <div className="radar-title-main">ANOMALY RADAR MATRIX</div>
              <div className="radar-title-sub">
                1420.4 MHz // LOCAL VIRTUAL RIFT MAPPING
              </div>
            </div>
          </div>

          <div className="radar-header-controls">
            <button
              className={`radar-setting-chip ${settings.locationEnabled ? 'active' : ''}`}
              onClick={handleToggleLocation}
              title="Toggle Real GPS vs Simulated Local Coordinates"
            >
              {settings.locationEnabled ? '📍 GPS: ON' : '📍 GPS: OFF'}
            </button>
            <button
              className={`radar-setting-chip ${settings.hapticsEnabled ? 'active' : ''}`}
              onClick={handleToggleHaptics}
              title="Toggle Proximity Haptic Feedback"
            >
              {settings.hapticsEnabled ? '📳 HAPTICS: ON' : '📳 HAPTICS: OFF'}
            </button>
            <button
              className={`radar-setting-chip ${settings.radarAudioEnabled ? 'active' : ''}`}
              onClick={handleToggleAudio}
              title="Toggle Radar Sweep & Proximity Beeps"
            >
              {settings.radarAudioEnabled ? '🔊 SFX: ON' : '🔇 SFX: OFF'}
            </button>
            <button
              className="radar-close-btn"
              onClick={onClose}
              title="Close Radar"
            >
              ✕
            </button>
          </div>
        </header>

        {/* GPS Status Notice / Error */}
        {gpsErrorMsg && (
          <div className="radar-notice-banner warning">
            <span>⚠ {gpsErrorMsg}</span>
          </div>
        )}

        <div className="radar-content-body">
          {/* Main Visual Radar Display Area */}
          <div className="radar-display-column">
            <div className="radar-canvas-container">
              <canvas
                ref={canvasRef}
                width={280}
                height={280}
                className="radar-canvas"
              />
              <div className="radar-grid-telemetry">
                <span className="radar-telemetry-tag">
                  ORIGIN: {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}
                </span>
                <span className="radar-telemetry-tag">
                  {settings.locationEnabled ? `GPS [${gpsStatus}]: ±${Math.round(userLocation.accuracy)}m` : 'VIRTUAL LOCAL GRID'}
                </span>
              </div>
            </div>

            {/* Anomaly Quick Selector Chips */}
            <div className="radar-blip-selector">
              {anomalies.map((ano) => (
                <button
                  key={ano.id}
                  className={`radar-anomaly-chip ${selectedAnomalyId === ano.id ? 'active' : ''} ${ano.inRange ? 'in-range' : ''}`}
                  onClick={() => {
                    setSelectedAnomalyId(ano.id);
                    soundEffects.playButtonBeep(480, 0.04);
                  }}
                >
                  <span className="ano-chip-code">{ano.designation}</span>
                  <span className="ano-chip-dist">{ano.distanceMeters}m</span>
                  {ano.inRange && <span className="ano-range-dot">●</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Anomaly Tactical Dossier & Proximity Engagement */}
          <div className="radar-details-column">
            <div className="radar-target-header">
              <div className="radar-target-title-block">
                <span className="radar-target-designation">{selectedAnomaly.designation}</span>
                <h3 className="radar-target-name">{selectedAnomaly.title}</h3>
                <div className="radar-target-badges">
                  <span className="radar-badge-threat">{selectedAnomaly.threat} THREAT</span>
                  <span className="radar-badge-res">{selectedAnomaly.resonance}</span>
                </div>
              </div>
            </div>

            {/* Signal Strength & Telemetry Meter */}
            <div className="radar-signal-telemetry-card">
              <div className="signal-meter-header">
                <span className="signal-label">SIGNAL RESONANCE:</span>
                <span className="signal-val-txt">{selectedAnomaly.signalPct}% ({selectedAnomaly.dbm} dBm)</span>
              </div>

              <div className="signal-progress-bar-shell">
                <div
                  className="signal-progress-bar-fill"
                  style={{
                    width: `${selectedAnomaly.signalPct}%`,
                    backgroundColor: selectedAnomaly.inRange ? '#00ff88' : '#00f0ff',
                  }}
                ></div>
              </div>

              <div className="target-proximity-specs">
                <div className="spec-metric">
                  <span className="metric-label">DISTANCE:</span>
                  <span className={`metric-val ${selectedAnomaly.inRange ? 'highlight-green' : ''}`}>
                    {selectedAnomaly.distanceMeters}m
                  </span>
                </div>
                <div className="spec-metric">
                  <span className="metric-label">BEARING:</span>
                  <span className="metric-val">{selectedAnomaly.bearing}°</span>
                </div>
                <div className="spec-metric">
                  <span className="metric-label">THRESHOLD:</span>
                  <span className="metric-val">&lt; {selectedAnomaly.encounterRadius}m</span>
                </div>
              </div>
            </div>

            {/* Description Lore */}
            <p className="radar-target-desc">{selectedAnomaly.description}</p>

            {/* Engagement Status & Action Button */}
            <div className="radar-action-area">
              {selectedAnomaly.isCoolingDown ? (
                <div className="radar-status-box cooling-down">
                  <span className="status-icon">⏳</span>
                  <span>ANOMALOUS FLUX DEPLETED // COOLING DOWN ({selectedAnomaly.cooldownRemainingSec}s)</span>
                </div>
              ) : selectedAnomaly.inRange ? (
                <div className="radar-status-box ready">
                  <span className="status-icon">⚡</span>
                  <span>IN MANIFESTATION RANGE // RIFT COHERENT</span>
                </div>
              ) : (
                <div className="radar-status-box out-of-range">
                  <span className="status-icon">📡</span>
                  <span>OUT OF RANGE // APPROACH WITHIN {selectedAnomaly.encounterRadius}m</span>
                </div>
              )}

              <button
                id="radar-engage-btn"
                className={`radar-engage-action-btn ${selectedAnomaly.canEngage ? 'engage-ready' : 'disabled'}`}
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

            {/* Proximity Walk Simulator for Testing on Laptop / Indoors */}
            <div className="radar-simulator-panel">
              <div className="sim-panel-header">
                <span>🕹 PROXIMITY SIMULATOR (INDOOR &amp; LAPTOP TESTING)</span>
                <span className="sim-offset-val">+{simulationOffset}m</span>
              </div>
              <p className="sim-hint">
                Simulate walking toward anomalies without leaving your desk or when testing indoors.
              </p>
              <div className="sim-button-row">
                <button
                  type="button"
                  className="sim-step-btn"
                  onClick={() => handleApproachBy(15)}
                  title="Simulate walking 15 meters closer"
                >
                  👟 APPROACH +15m
                </button>
                <button
                  type="button"
                  className="sim-step-btn"
                  onClick={() => handleApproachBy(-15)}
                  disabled={simulationOffset <= 0}
                  title="Simulate stepping back 15 meters"
                >
                  BACK -15m
                </button>
                <button
                  type="button"
                  className="sim-step-btn reset"
                  onClick={handleResetSimulation}
                  disabled={simulationOffset === 0}
                  title="Reset simulation offset to physical GPS coordinates"
                >
                  RESET
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Safety & Privacy Legal Footer Banner (Requirement 5) */}
        <footer className="radar-safety-footer">
          <div className="safety-warning-line">
            <span className="warning-icon">⚠</span>
            <span>
              <strong>SAFETY DIRECTIVE:</strong> Remain aware of physical surroundings. Stop moving before entering AR. Never step into roadways or trespass onto private property.
            </span>
          </div>
          <div className="privacy-guarantee-line">
            <span>
              <strong>PRIVACY &amp; FICTION:</strong> Anomalies are fictional digital assets. Coordinates remain entirely on your local device and are never transmitted to external servers.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
