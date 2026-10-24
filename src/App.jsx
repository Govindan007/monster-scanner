import React, { useState, useEffect, useRef, useCallback } from 'react';
import LandingScreen from './components/LandingScreen';
import CameraFeed from './components/CameraFeed';
import ScannerOverlay from './components/ScannerOverlay';
import RealWorldAR from './components/RealWorldAR';
import { soundEffects } from './services/soundEffects';
import { checkWebXRSupport } from './services/deviceDiagnostics';

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Real-world AR state
  const [isARActive, setIsARActive] = useState(false);
  const [arSupported, setArSupported] = useState(null);
  const [arUnsupportedNotice, setArUnsupportedNotice] = useState(null);

  // Scanner state
  const [realityIntegrity, setRealityIntegrity] = useState(100);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [scanStatus, setScanStatus] = useState('SEARCHING...');
  const [activeAnomaly, setActiveAnomaly] = useState(null);
  const [glitchActive, setGlitchActive] = useState(false);

  // Refs for timer cleanup & concurrency guards
  const activeAnomalyRef = useRef(null);
  const anomalyScheduleTimerRef = useRef(null);
  const anomalyDurationTimerRef = useRef(null);
  const statusResetTimerRef = useRef(null);
  const glitchTimerRef = useRef(null);

  // Check WebXR support on startup
  useEffect(() => {
    checkWebXRSupport().then((res) => {
      setArSupported(res.supported);
    });
  }, []);

  // Keep activeAnomalyRef synchronized to prevent simultaneous spawns
  useEffect(() => {
    activeAnomalyRef.current = activeAnomaly;
  }, [activeAnomaly]);

  // Clear all pending timers
  const clearAllTimers = useCallback(() => {
    if (anomalyScheduleTimerRef.current) clearTimeout(anomalyScheduleTimerRef.current);
    if (anomalyDurationTimerRef.current) clearTimeout(anomalyDurationTimerRef.current);
    if (statusResetTimerRef.current) clearTimeout(statusResetTimerRef.current);
    if (glitchTimerRef.current) clearTimeout(glitchTimerRef.current);
  }, []);

  // Schedule next anomaly after random delay of 8-15 seconds
  const scheduleNextAnomaly = useCallback(() => {
    if (anomalyScheduleTimerRef.current) clearTimeout(anomalyScheduleTimerRef.current);
    const delay = Math.floor(Math.random() * 7000 + 8000);
    anomalyScheduleTimerRef.current = setTimeout(() => {
      spawnAnomaly();
    }, delay);
  }, []);

  // Spawn the Phase 2 Humanoid Anomaly Event
  const spawnAnomaly = useCallback(() => {
    if (activeAnomalyRef.current) return;

    clearAllTimers();

    const isLeft = Math.random() > 0.5;
    const posX = isLeft
      ? Math.floor(Math.random() * 16 + 22)
      : Math.floor(Math.random() * 16 + 62);
    const posY = Math.floor(Math.random() * 22 + 25);
    const distance = (Math.random() * 1.4 + 1.2).toFixed(1);

    soundEffects.playAnomalySpawn();
    setGlitchActive(true);
    glitchTimerRef.current = setTimeout(() => {
      setGlitchActive(false);
    }, 450);

    setScanStatus('ANOMALY DETECTED // UNKNOWN ENTITY');

    const newAnomaly = {
      id: 'humanoid-shadow',
      title: 'UNKNOWN ENTITY',
      code: 'ANOMALY DETECTED',
      position: { x: posX, y: posY },
      distance: distance,
    };

    activeAnomalyRef.current = newAnomaly;
    setActiveAnomaly(newAnomaly);

    const visibleDuration = Math.floor(Math.random() * 2000 + 4000);
    anomalyDurationTimerRef.current = setTimeout(() => {
      soundEffects.playAnomalyLost();
      activeAnomalyRef.current = null;
      setActiveAnomaly(null);
      setScanStatus('ENTITY LOST');

      setAnomalyCount((prev) => prev + 1);
      setRealityIntegrity((prev) => Math.max(0, prev - 5));

      statusResetTimerRef.current = setTimeout(() => {
        setScanStatus('SEARCHING...');
        scheduleNextAnomaly();
      }, 2000);
    }, visibleDuration);
  }, [clearAllTimers, scheduleNextAnomaly]);

  // Handle entering scan mode
  const handleStartScan = (simulated = false) => {
    setIsScanning(true);
    setIsSimulated(simulated);
    setRealityIntegrity(100);
    setAnomalyCount(0);
    setScanStatus('SEARCHING...');
    setActiveAnomaly(null);
    activeAnomalyRef.current = null;
    clearAllTimers();

    const initialDelay = Math.floor(Math.random() * 7000 + 8000);
    anomalyScheduleTimerRef.current = setTimeout(() => {
      spawnAnomaly();
    }, initialDelay);
  };

  // Manual Trigger: SCAN button
  const handleManualScan = () => {
    if (activeAnomalyRef.current) return;
    spawnAnomaly();
  };

  // Handler for ENTER REAL AR
  const handleEnterRealAR = async () => {
    soundEffects.playRadarPulse();
    const xrCheck = await checkWebXRSupport();
    setArSupported(xrCheck.supported);

    if (xrCheck.supported) {
      clearAllTimers();
      setIsARActive(true);
    } else {
      soundEffects.playButtonBeep(340, 0.15);
      setArUnsupportedNotice(xrCheck.reason);
    }
  };

  // Recalibrate system
  const handleRecalibrate = () => {
    setRealityIntegrity(100);
    setScanStatus('INTEGRITY RESTORED // RECALIBRATED');
    setTimeout(() => {
      setScanStatus('SEARCHING...');
    }, 1800);
  };

  // Exit back to landing screen
  const handleExit = () => {
    clearAllTimers();
    activeAnomalyRef.current = null;
    setActiveAnomaly(null);
    setIsScanning(false);
    setIsARActive(false);
    soundEffects.stopAmbientHum();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
      soundEffects.stopAmbientHum();
    };
  }, [clearAllTimers]);

  return (
    <div className="veil-app-root">
      {!isScanning ? (
        <LandingScreen
          onStartScan={() => handleStartScan(false)}
          onStartSimulated={() => handleStartScan(true)}
        />
      ) : isARActive ? (
        /* Real-World Tracked WebXR AR Mode */
        <RealWorldAR
          onExitAR={() => {
            setIsARActive(false);
            soundEffects.playButtonBeep(600, 0.08);
            scheduleNextAnomaly();
          }}
          onEntityPlaced={() => {
            setAnomalyCount((prev) => prev + 1);
            setRealityIntegrity((prev) => Math.max(0, prev - 5));
          }}
        />
      ) : (
        /* Standard Camera Scanner (PC / Mobile default) */
        <div className="scanner-container">
          <CameraFeed
            isSimulated={isSimulated}
            onToggleSimulated={setIsSimulated}
            cameraError={cameraError}
            setCameraError={setCameraError}
            showDiagnostics={showDiagnostics}
            setShowDiagnostics={setShowDiagnostics}
          />
          <ScannerOverlay
            activeAnomaly={activeAnomaly}
            realityIntegrity={realityIntegrity}
            anomalyCount={anomalyCount}
            scanStatus={scanStatus}
            glitchActive={glitchActive}
            onTriggerScan={handleManualScan}
            onRecalibrate={handleRecalibrate}
            onExit={handleExit}
            isSimulated={isSimulated}
            onToggleSimulated={setIsSimulated}
            showDiagnostics={showDiagnostics}
            setShowDiagnostics={setShowDiagnostics}
            onEnterRealAR={handleEnterRealAR}
            arSupported={arSupported}
            arUnsupportedNotice={arUnsupportedNotice}
            setArUnsupportedNotice={setArUnsupportedNotice}
          />
        </div>
      )}
    </div>
  );
}
