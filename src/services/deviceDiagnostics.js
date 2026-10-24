// Real Device & Browser Environment Diagnostics
// Strictly checks W3C standards without fake sensor or motion APIs

export function getSystemDiagnostics() {
  const isSecure = typeof window !== 'undefined' && Boolean(
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  const hasMediaDevices = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices);
  const hasGetUserMedia = typeof navigator !== 'undefined' && Boolean(
    navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'
  );

  return {
    isSecureContext: isSecure,
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown:',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
    hasMediaDevices,
    hasGetUserMedia,
    cameraApiAvailable: hasGetUserMedia,
  };
}

export async function queryCameraPermission() {
  if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
    return 'UNSUPPORTED_PERMISSIONS_API';
  }
  try {
    const status = await navigator.permissions.query({ name: 'camera' });
    return status.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'UNKNOWN';
  }
}

export async function checkWebXRSupport() {
  if (typeof navigator === 'undefined' || !navigator.xr) {
    return {
      supported: false,
      reason: 'WebXR API is not supported by this browser. (navigator.xr is undefined)',
    };
  }
  try {
    const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
    return {
      supported: isSupported,
      reason: isSupported
        ? null
        : 'immersive-ar mode is not supported on this device. Real-world AR tracking requires ARCore on Android Chrome or an AR headset.',
    };
  } catch (err) {
    return {
      supported: false,
      reason: `WebXR Check Error: ${err.message}`,
    };
  }
}
