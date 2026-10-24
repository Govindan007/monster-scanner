import React from 'react';

export default function DiagnosticHUD({
  diagnostics,
  permissionState,
  cameraError,
  cameraActive,
  compact = false,
  onRetry,
  xrSupported = null,
}) {
  const isSecure = diagnostics.isSecureContext;
  const isApiAvailable = diagnostics.cameraApiAvailable;

  const getStatusBadge = (val) => {
    return val ? (
      <span className="diag-badge yes">YES</span>
    ) : (
      <span className="diag-badge no">NO</span>
    );
  };

  const getPermissionLabel = () => {
    if (cameraActive) return <span className="diag-badge active">STREAMING (ACTIVE)</span>;
    if (cameraError) {
      if (cameraError.type === 'INSECURE_CONTEXT') return <span className="diag-badge no">BLOCKED (INSECURE HTTP)</span>;
      if (cameraError.type === 'PERMISSION_DENIED') return <span className="diag-badge no">DENIED</span>;
      if (cameraError.type === 'CAMERA_BUSY') return <span className="diag-badge warn">BUSY (IN USE)</span>;
      if (cameraError.type === 'NOT_FOUND') return <span className="diag-badge warn">NOT FOUND</span>;
      if (cameraError.type === 'UNSUPPORTED') return <span className="diag-badge no">UNSUPPORTED</span>;
      return <span className="diag-badge no">ERROR</span>;
    }
    if (permissionState === 'granted') return <span className="diag-badge yes">GRANTED</span>;
    if (permissionState === 'denied') return <span className="diag-badge no">DENIED</span>;
    if (permissionState === 'prompt') return <span className="diag-badge warn">PROMPT (PENDING)</span>;
    return <span className="diag-badge neutral">{permissionState || 'UNKNOWN'}</span>;
  };

  return (
    <div className={`diagnostic-hud-card ${compact ? 'compact' : ''}`}>
      <div className="diag-header">
        <span className="diag-title">SYSTEM DIAGNOSTICS // OPTICAL SENSOR</span>
        {compact && onRetry && (
          <button className="diag-retry-mini" onClick={onRetry}>
            RETRY
          </button>
        )}
      </div>

      <div className="diag-grid">
        <div className="diag-row">
          <span className="diag-key">HTTPS / SECURE CONTEXT:</span>
          <span className="diag-val">{getStatusBadge(isSecure)}</span>
        </div>
        <div className="diag-row">
          <span className="diag-key">CAMERA API AVAILABLE:</span>
          <span className="diag-val">{getStatusBadge(isApiAvailable)}</span>
        </div>
        {xrSupported !== null && (
          <div className="diag-row">
            <span className="diag-key">WEBXR (immersive-ar):</span>
            <span className="diag-val">{getStatusBadge(xrSupported)}</span>
          </div>
        )}
        <div className="diag-row">
          <span className="diag-key">PERMISSION / SENSOR STATE:</span>
          <span className="diag-val">{getPermissionLabel()}</span>
        </div>
      </div>

      {cameraError && (
        <div className="diag-error-box">
          <div className="diag-error-code">[{cameraError.code}]</div>
          <div className="diag-error-msg">{cameraError.message}</div>
          {cameraError.guidance && (
            <div className="diag-error-guidance">{cameraError.guidance}</div>
          )}
        </div>
      )}
    </div>
  );
}
