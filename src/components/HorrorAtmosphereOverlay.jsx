import React, { useState, useEffect } from 'react';
import { horrorAtmosphere } from '../services/horrorAtmosphereService';

export default function HorrorAtmosphereOverlay({
  encounterState = 'DORMANT',
  isScanning = false,
  activeEntityId = 'the-watcher',
}) {
  const [settings, setSettings] = useState(() => horrorAtmosphere.getSettings());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );

  useEffect(() => {
    const unsub = horrorAtmosphere.subscribe((updated) => {
      setSettings(updated);
    });

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = (e) => setPrefersReducedMotion(e.matches);
      if (mq.addEventListener) {
        mq.addEventListener('change', handler);
        return () => {
          unsub();
          mq.removeEventListener('change', handler);
        };
      }
    }

    return unsub;
  }, []);

  if (!settings.visualEffectsEnabled || prefersReducedMotion) {
    return null;
  }

  const suspense = horrorAtmosphere.calculateSuspense(encounterState, isScanning);

  // If no suspense and not scanning, return null to avoid unnecessary paint layers
  if (suspense <= 0.05 && !isScanning) {
    return null;
  }

  // Determine creature tint class
  let creatureTintClass = 'tint-watcher';
  if (activeEntityId === 'the-drifter') creatureTintClass = 'tint-drifter';
  if (activeEntityId === 'the-crawler') creatureTintClass = 'tint-crawler';

  return (
    <div
      className={`horror-atmosphere-root ${creatureTintClass}`}
      style={{
        '--suspense-level': suspense,
      }}
      aria-hidden="true"
    >
      {/* Peripheral Suspense Vignette */}
      <div className="atmosphere-vignette" />

      {/* Edge chromatic fringe during agitated or scanning states */}
      {(encounterState === 'DISTURBED' || isScanning) && (
        <div className="atmosphere-chromatic-fringe" />
      )}

      {/* Subtle CRT interference scanlines during active scanning */}
      {isScanning && (
        <div className="atmosphere-interference-lines" />
      )}
    </div>
  );
}
