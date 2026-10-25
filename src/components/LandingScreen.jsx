import React, { useState } from 'react';
import { soundEffects } from '../services/soundEffects';
import { getDiscoveredEntities } from '../services/discoveryStorage';
import { getJournalData } from '../services/investigationStorage';
import { getAllEntities } from '../ar/entities/EntityRegistry';

export default function LandingScreen({
  onStartScan,
  onStartSimulated,
  onOpenJournal,
  unreviewedEvidenceCount = 0,
  onOpenRadar,
  onOpenSettings,
}) {
  const [stats] = useState(() => {
    try {
      const discoveries = getDiscoveredEntities();
      const allEntities = getAllEntities();
      const discCount = allEntities.filter((e) => discoveries[e.id]?.discovered).length;
      const journal = getJournalData();

      return {
        discoveredCount: discCount,
        totalEntities: allEntities.length,
        evidenceCount: journal.evidence?.length || 0,
        encounterCount: journal.encounters?.length || 0,
      };
    } catch {
      return {
        discoveredCount: 0,
        totalEntities: 3,
        evidenceCount: 0,
        encounterCount: 0,
      };
    }
  });

  const handleStart = (useSimulated = false) => {
    soundEffects.init();
    soundEffects.playRadarPulse();
    soundEffects.startAmbientHum();
    if (useSimulated) {
      onStartSimulated();
    } else {
      onStartScan();
    }
  };

  return (
    <div className="landing-screen-root">
      {/* Cinematic Ambient Atmosphere Background */}
      <div className="landing-ambient-bg" aria-hidden="true">
        <div className="landing-radial-glow"></div>
        <div className="landing-subtle-grid"></div>
        <div className="landing-film-grain"></div>
      </div>

      <div className="landing-safe-viewport">
        {/* Top Operational Status Bar */}
        <header className="landing-top-bar">
          <div className="top-status-indicator">
            <span className="live-status-dot"></span>
            <span className="status-label-mono">SYS.ONLINE // OPTICAL ARRAY</span>
          </div>
          <button
            type="button"
            className="landing-quick-settings-btn"
            onClick={() => {
              soundEffects.playButtonBeep(520, 0.04);
              if (onOpenSettings) onOpenSettings();
            }}
            title="Audio & Immersion Settings"
          >
            <span>⚙</span>
          </button>
        </header>

        {/* Hero Branding Block */}
        <main className="landing-hero-block">
          <div className="landing-brand-container">
            <div className="landing-emblem-badge">
              <span className="emblem-glyph">◈</span>
              <span>CLASSIFIED PARANORMAL PROTOCOL</span>
            </div>

            <h1 className="landing-veil-title" data-text="VEIL">
              VEIL
            </h1>

            <div className="landing-tagline">
              <span className="tagline-quote">&ldquo;</span>
              REALITY IS NOT AS IT APPEARS
              <span className="tagline-quote">&rdquo;</span>
            </div>

            <p className="landing-instrument-desc">
              Experimental phase-shifted optical frequency scanner. Localizing non-baryonic metaphysical entities coexisting within physical coordinates.
            </p>
          </div>

          {/* Investigation Telemetry Summary Card */}
          <section className="landing-telemetry-card" aria-label="Investigation Progress">
            <div className="telemetry-card-header">
              <span className="telemetry-card-title">INVESTIGATION LOGS</span>
              <span className="telemetry-sec-tag">LOCAL STORAGE</span>
            </div>

            <div className="telemetry-stats-grid">
              <div className="stat-pod">
                <span className="stat-pod-val cyan">
                  {stats.discoveredCount}
                  <span className="stat-pod-sub">/{stats.totalEntities}</span>
                </span>
                <span className="stat-pod-lbl">ENTITIES LOGGED</span>
              </div>

              <div className="stat-pod">
                <span className="stat-pod-val amber">{stats.evidenceCount}</span>
                <span className="stat-pod-lbl">EVIDENCE PIECES</span>
              </div>

              <div className="stat-pod">
                <span className="stat-pod-val green">{stats.encounterCount}</span>
                <span className="stat-pod-lbl">ENCOUNTERS</span>
              </div>
            </div>
          </section>

          {/* Primary & Secondary Action Hub */}
          <div className="landing-action-hub">
            {/* Primary Action Button */}
            <button
              id="start-scan-btn"
              type="button"
              className="landing-primary-scan-cta"
              onClick={() => handleStart(false)}
            >
              <div className="cta-scanner-sweep"></div>
              <span className="cta-bracket">[</span>
              <span className="cta-text">INITIALIZE SCANNER</span>
              <span className="cta-bracket">]</span>
            </button>

            {/* Tactical Secondary Navigation Matrix */}
            <div className="landing-secondary-nav">
              {onOpenRadar && (
                <button
                  type="button"
                  id="landing-radar-btn"
                  className="landing-nav-chip"
                  onClick={() => {
                    soundEffects.playButtonBeep(640, 0.05);
                    onOpenRadar();
                  }}
                >
                  <span className="nav-chip-icon">📡</span>
                  <span className="nav-chip-label">ANOMALY RADAR</span>
                </button>
              )}

              {onOpenJournal && (
                <button
                  type="button"
                  id="landing-journal-btn"
                  className="landing-nav-chip"
                  onClick={() => {
                    soundEffects.playButtonBeep(520, 0.05);
                    onOpenJournal();
                  }}
                >
                  <span className="nav-chip-icon">📁</span>
                  <span className="nav-chip-label">CASE JOURNAL</span>
                  {unreviewedEvidenceCount > 0 && (
                    <span className="nav-chip-badge">{unreviewedEvidenceCount}</span>
                  )}
                </button>
              )}
            </div>

            {/* Non-Camera Simulation Mode */}
            <button
              type="button"
              className="landing-sim-link"
              onClick={() => handleStart(true)}
              title="Launch chamber simulator without hardware camera access"
            >
              <span>🖥 RUN SIMULATED CHAMBER FEED (NO CAMERA)</span>
            </button>
          </div>
        </main>

        {/* Minimalist Footnote */}
        <footer className="landing-bottom-bar">
          <span>VEIL INSTRUMENT // v8.4.1</span>
          <span>HTTPS SECURED</span>
        </footer>
      </div>
    </div>
  );
}
