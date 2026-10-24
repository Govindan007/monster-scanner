import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSystemDiagnostics, queryCameraPermission } from '../services/deviceDiagnostics';
import DiagnosticHUD from './DiagnosticHUD';

export default function CameraFeed({
  isSimulated,
  onToggleSimulated,
  cameraError,
  setCameraError,
  showDiagnostics,
  setShowDiagnostics,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [diagnostics, setDiagnostics] = useState(() => getSystemDiagnostics());
  const [permissionState, setPermissionState] = useState('prompt');

  // Update permission status
  const refreshPermissionState = useCallback(async () => {
    const perm = await queryCameraPermission();
    setPermissionState(perm);
  }, []);

  // Initialize Camera
  const startCamera = useCallback(async () => {
    if (isSimulated) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      return;
    }

    setCameraError(null);
    const diag = getSystemDiagnostics();
    setDiagnostics(diag);
    await refreshPermissionState();

    // 1. Check for Secure Context (HTTPS or localhost)
    if (!diag.isSecureContext) {
      const err = {
        type: 'INSECURE_CONTEXT',
        code: 'INSECURE_CONTEXT_DETECTED',
        message: 'Camera API blocked on insecure origin (HTTP).',
        guidance: `Mobile browsers strictly disable camera access over plain HTTP (${window.location.origin}). Please connect via HTTPS or localhost.`,
      };
      setCameraError(err);
      setCameraActive(false);
      return;
    }

    // 2. Check for navigator.mediaDevices and getUserMedia support
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      const err = {
        type: 'UNSUPPORTED',
        code: 'CAMERA_API_UNAVAILABLE',
        message: 'Browser does not support navigator.mediaDevices.getUserMedia.',
        guidance: 'Please update your mobile browser or use an updated version of Chrome or Safari.',
      };
      setCameraError(err);
      setCameraActive(false);
      return;
    }

    // 3. Attempt to acquire rear/environment camera
    try {
      let stream = null;

      // Primary attempt: Prefer rear/environment camera with 1080p ideal resolution
      const primaryConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (firstErr) {
        // Fallback for Overconstrained or specific resolution failure on certain mobile devices
        if (
          firstErr.name === 'OverconstrainedError' ||
          firstErr.name === 'ConstraintNotSatisfiedError'
        ) {
          console.warn('Overconstrained with 1080p, retrying with relaxed environment constraints...');
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: 'environment' } },
              audio: false,
            });
          } catch {
            // Final fallback to any video camera
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        } else {
          throw firstErr;
        }
      }

      if (!stream) {
        throw new Error('STREAM_ACQUISITION_FAILED');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setPermissionState('granted');

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        if (track && track.getCapabilities && track.getCapabilities().torch) {
          setHasTorch(true);
        }
      }
    } catch (err) {
      console.warn('Camera acquisition error:', err);
      setCameraActive(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setCameraError({
          type: 'PERMISSION_DENIED',
          code: 'CAMERA_PERMISSION_DENIED',
          message: 'Camera permission denied by user or system.',
          guidance: 'Tap the lock/settings icon in the browser address bar and grant camera permissions.',
        });
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError({
          type: 'NOT_FOUND',
          code: 'CAMERA_UNAVAILABLE',
          message: 'No camera hardware found on this device.',
          guidance: 'Ensure your camera is connected and recognized by your device hardware.',
        });
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError({
          type: 'CAMERA_BUSY',
          code: 'CAMERA_ALREADY_IN_USE',
          message: 'Camera sensor is currently in use by another application.',
          guidance: 'Close any background video apps, browser tabs, or scanner applications.',
        });
      } else if (err.name === 'SecurityError') {
        setCameraError({
          type: 'INSECURE_CONTEXT',
          code: 'SECURITY_RESTRICTION',
          message: 'Camera access blocked due to security restrictions.',
          guidance: 'Ensure your connection is secure (HTTPS) and not blocked by iframe/sandbox policies.',
        });
      } else {
        setCameraError({
          type: 'UNKNOWN_ERROR',
          code: err.name || 'SENSOR_INITIALIZATION_ERROR',
          message: err.message || 'Failed to initialize camera sensor.',
          guidance: 'Check browser settings and reload the page.',
        });
      }
    }
  }, [isSimulated, refreshPermissionState, setCameraError]);

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  // Flashlight toggle
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const nextState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Canvas renderer for simulated analog night-vision chamber feed
  useEffect(() => {
    if (!isSimulated && !cameraError) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let t = 0;

    const render = () => {
      t += 0.03;
      const width = (canvas.width = window.innerWidth || 360);
      const height = (canvas.height = window.innerHeight || 640);

      // Deep green/slate night-vision backdrop
      ctx.fillStyle = '#050a07';
      ctx.fillRect(0, 0, width, height);

      // Perspective lines of containment cell
      ctx.strokeStyle = 'rgba(40, 90, 60, 0.2)';
      ctx.lineWidth = 1.5;

      const vanishingX = width * 0.5 + Math.sin(t * 0.5) * 8;
      const vanishingY = height * 0.45 + Math.cos(t * 0.7) * 5;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(vanishingX, vanishingY);
      ctx.moveTo(width, 0);
      ctx.lineTo(vanishingX, vanishingY);
      ctx.moveTo(0, height);
      ctx.lineTo(vanishingX, vanishingY);
      ctx.moveTo(width, height);
      ctx.lineTo(vanishingX, vanishingY);

      const bw = width * 0.28;
      const bh = height * 0.28;
      ctx.strokeRect(vanishingX - bw / 2, vanishingY - bh / 2, bw, bh);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(50, 110, 75, 0.3)';
      ctx.strokeRect(vanishingX - bw * 0.25, vanishingY - bh * 0.4, bw * 0.5, bh * 0.9);

      // Analog static noise
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const noiseDensity = 0.08;
      for (let i = 0; i < data.length; i += 4 * 3) {
        if (Math.random() < noiseDensity) {
          const val = Math.floor(Math.random() * 55 + 20);
          data[i] = val * 0.4;
          data[i + 1] = val;
          data[i + 2] = val * 0.5;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      // Horizontal scanning beam
      const scanY = (t * 80) % height;
      const grad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
      grad.addColorStop(0, 'rgba(34, 197, 94, 0)');
      grad.addColorStop(0.5, 'rgba(34, 197, 94, 0.07)');
      grad.addColorStop(1, 'rgba(34, 197, 94, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 15, width, 30);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSimulated, cameraError]);

  return (
    <div className="camera-feed-container">
      {/* Real Live Video Feed */}
      <video
        ref={videoRef}
        className={`camera-video ${cameraActive && !isSimulated ? 'active' : 'hidden'}`}
        playsInline
        autoPlay
        muted
      />

      {/* Simulated Feed Canvas (fallback or manual switch) */}
      <canvas
        ref={canvasRef}
        className={`simulated-feed-canvas ${isSimulated || cameraError ? 'active' : 'hidden'}`}
      />

      {/* ALWAYS ACCESSIBLE VISIBLE DIAGNOSTICS HUD */}
      {showDiagnostics && (
        <div className="diagnostics-floating-panel">
          <DiagnosticHUD
            diagnostics={diagnostics}
            permissionState={permissionState}
            cameraError={cameraError}
            cameraActive={cameraActive}
            onRetry={startCamera}
          />
        </div>
      )}

      {/* Camera Error or Fallback Warning Banner */}
      {cameraError && !isSimulated && (
        <div className="camera-fallback-banner">
          <div className="camera-error-badge">⚠ SENSOR FAULT // {cameraError.code}</div>
          <p className="camera-error-text">{cameraError.message}</p>
          <p className="camera-guidance-text">{cameraError.guidance}</p>

          {/* Embedded Full Diagnostic State */}
          <div className="embedded-diagnostics">
            <DiagnosticHUD
              diagnostics={diagnostics}
              permissionState={permissionState}
              cameraError={cameraError}
              cameraActive={cameraActive}
              compact={true}
              onRetry={startCamera}
            />
          </div>

          <div className="camera-error-actions">
            <button
              className="cyber-button-sm primary"
              onClick={() => onToggleSimulated(true)}
            >
              RUN SIMULATED CHAMBER FEED
            </button>
            <button
              className="cyber-button-sm secondary"
              onClick={startCamera}
            >
              RETRY OPTICAL SENSOR
            </button>
          </div>
        </div>
      )}

      {/* Quick Feed Mode Switch Floating Pill */}
      <div className="feed-mode-indicator">
        <span className="feed-status-dot"></span>
        <span className="feed-name">
          {isSimulated || cameraError ? 'FEED: SIMULATED FACILITY CAM-04' : 'FEED: OPTICAL SENSOR LIVE'}
        </span>
        {hasTorch && (
          <button
            className={`torch-toggle-btn ${torchOn ? 'on' : ''}`}
            onClick={toggleTorch}
            title="Toggle UV Flashlight"
          >
            🔦 {torchOn ? 'UV ON' : 'UV OFF'}
          </button>
        )}
      </div>
    </div>
  );
}
