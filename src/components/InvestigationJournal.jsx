import React, { useState, useEffect } from 'react';
import {
  getJournalData,
  getEntityDossier,
  markEvidenceReviewed,
  markAllEvidenceReviewed,
  getUnreviewedEvidenceCount,
} from '../services/investigationStorage';
import { EvidenceCategoryLabels } from '../data/investigationDefinitions';
import { getAllEntities } from '../ar/entities/EntityRegistry';
import { soundEffects } from '../services/soundEffects';
import CreatureSilhouette from './CreatureSilhouette';

export default function InvestigationJournal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('dossiers'); // 'dossiers' | 'evidence' | 'timeline'
  const [selectedEntityId, setSelectedEntityId] = useState('the-watcher');
  const [evidenceFilterCategory, setEvidenceFilterCategory] = useState('ALL');

  // Journal data snapshot state
  const [journalData, setJournalData] = useState(() => getJournalData());
  const [unreviewedCount, setUnreviewedCount] = useState(() => getUnreviewedEvidenceCount());

  // Refresh journal data asynchronously when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setJournalData(getJournalData());
        setUnreviewedCount(getUnreviewedEvidenceCount());
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allEntities = getAllEntities();
  const currentDossier = getEntityDossier(selectedEntityId);

  // Filter evidence
  const filteredEvidence = journalData.evidence.filter((ev) => {
    const matchEntity = evidenceFilterEntity === 'ALL' || ev.entityId === evidenceFilterEntity;
    const matchCat = evidenceFilterCategory === 'ALL' || ev.category === evidenceFilterCategory;
    return matchEntity && matchCat;
  });

  const handleEvidenceClick = (evidenceId) => {
    markEvidenceReviewed(evidenceId);
    setJournalData(getJournalData());
    setUnreviewedCount(getUnreviewedEvidenceCount());
    soundEffects.playButtonBeep(750, 0.05);
  };

  const handleMarkAllReviewed = () => {
    markAllEvidenceReviewed();
    setJournalData(getJournalData());
    setUnreviewedCount(0);
    soundEffects.playButtonBeep(600, 0.08);
  };

  return (
    <div
      className="journal-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Paranormal Investigation Case Journal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="journal-modal-sheet">
        {/* Header Bar */}
        <header className="journal-modal-header">
          <div className="journal-header-title">
            <span className="journal-header-badge">CLASSIFIED REPOSITORY // CLEARANCE LVL 3</span>
            <h2 className="journal-title-text">INVESTIGATION JOURNAL</h2>
          </div>

          <div className="journal-header-actions">
            {unreviewedCount > 0 && (
              <button
                type="button"
                className="journal-mark-all-btn"
                onClick={handleMarkAllReviewed}
                title="Mark all evidence as reviewed"
              >
                ✓ REVIEW ALL ({unreviewedCount})
              </button>
            )}
            <button
              type="button"
              className="journal-close-btn"
              onClick={onClose}
              title="Close Journal"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Primary Tabs Navigation Bar */}
        <nav className="journal-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dossiers'}
            className={`journal-tab-pill ${activeTab === 'dossiers' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dossiers');
              soundEffects.playButtonBeep(520, 0.04);
            }}
          >
            <span>📁 ENTITY DOSSIERS</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'evidence'}
            className={`journal-tab-pill ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('evidence');
              soundEffects.playButtonBeep(520, 0.04);
            }}
          >
            <span>🔬 EVIDENCE CATALOG</span>
            {unreviewedCount > 0 && (
              <span className="tab-unread-counter">{unreviewedCount}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'timeline'}
            className={`journal-tab-pill ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('timeline');
              soundEffects.playButtonBeep(520, 0.04);
            }}
          >
            <span>⏳ TIMELINE</span>
            <span className="tab-count-sub">({journalData.encounters.length})</span>
          </button>
        </nav>

        {/* Tab 1: Progressive Entity Dossiers */}
        {activeTab === 'dossiers' && currentDossier && (
          <div className="journal-tab-content dossiers-tab-content">
            {/* Entity Selection Pills */}
            <div className="dossier-entity-switcher" role="tablist">
              {allEntities.map((ent) => (
                <button
                  key={ent.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedEntityId === ent.id}
                  className={`dossier-switcher-pill ${selectedEntityId === ent.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedEntityId(ent.id);
                    soundEffects.playButtonBeep(480, 0.04);
                  }}
                >
                  <span className="pill-name">{ent.name}</span>
                  <span className="pill-code">{ent.code.split(' // ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Dossier Header Card with Visual Thumbnail */}
            <div className="dossier-hero-card">
              <div className="dossier-hero-visual">
                <CreatureSilhouette
                  entityId={selectedEntityId}
                  size="small"
                  animate={true}
                />
              </div>

              <div className="dossier-hero-info">
                <div className="dossier-hero-top">
                  <span className="dossier-code-tag">{currentDossier.code}</span>
                  <span className={`dossier-threat-tag threat-${currentDossier.threat?.toLowerCase()}`}>
                    {currentDossier.threat} THREAT
                  </span>
                </div>
                <h3 className="dossier-creature-title">{currentDossier.name}</h3>
                <div className="dossier-classification-line">
                  <span className="dim-label">CLASSIFICATION:</span> {currentDossier.classification}
                </div>
                <div className="dossier-res-line">
                  <span className="dim-label">RESONANCE:</span> {currentDossier.resonance}
                </div>
              </div>
            </div>

            {/* Progressive Dossier Unlock Tier Progress Bar */}
            <div className="dossier-tier-tracker">
              <div className="tier-tracker-header">
                <span className="tracker-label">RESEARCH DOSSIER PROGRESSION</span>
                <span className="tracker-val">
                  TIER {currentDossier.unlockedTier} / {currentDossier.maxTiers} UNLOCKED
                </span>
              </div>
              <div className="tier-pills-row">
                {[0, 1, 2, 3].map((tierNum) => {
                  const isUnlocked = currentDossier.unlockedTier >= tierNum;
                  return (
                    <div
                      key={tierNum}
                      className={`tier-step-pill ${isUnlocked ? 'unlocked' : 'locked'}`}
                    >
                      <span className="step-num">{tierNum === 0 ? 'TIER 0' : `TIER ${tierNum}`}</span>
                      <span className="step-sub">
                        {tierNum === 0
                          ? 'DISCOVERY'
                          : tierNum === 1
                          ? '1 EVIDENCE'
                          : tierNum === 2
                          ? '2 EVIDENCE'
                          : 'HYPOTHESIS'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progressive Lore Dossier Sections */}
            <div className="dossier-lore-sections">
              {/* Origin Section */}
              <div className="lore-section-card">
                <div className="section-card-title">
                  <span className="section-icon">◈</span>
                  <span>ORIGIN &amp; DIMENSIONAL ATTRIBUTES</span>
                </div>
                <p className="section-body-text">{currentDossier.lore.origin}</p>
              </div>

              {/* Tier 1 Lore */}
              <div className={`lore-section-card ${currentDossier.unlockedTier >= 1 ? 'unlocked' : 'locked'}`}>
                <div className="section-card-title">
                  <span className="section-icon">{currentDossier.unlockedTier >= 1 ? '✓' : '🔒'}</span>
                  <span>SPECTRAL BEHAVIOR (TIER 1)</span>
                </div>
                <p className="section-body-text">{currentDossier.lore.tier1Lore}</p>
              </div>

              {/* Tier 2 Lore */}
              <div className={`lore-section-card ${currentDossier.unlockedTier >= 2 ? 'unlocked' : 'locked'}`}>
                <div className="section-card-title">
                  <span className="section-icon">{currentDossier.unlockedTier >= 2 ? '✓' : '🔒'}</span>
                  <span>OPTICAL VULNERABILITY &amp; AGITATION (TIER 2)</span>
                </div>
                <p className="section-body-text">{currentDossier.lore.tier2Lore}</p>
              </div>

              {/* Tier 3 Hypotheses */}
              <div className={`lore-section-card ${currentDossier.unlockedTier >= 3 ? 'unlocked' : 'locked'}`}>
                <div className="section-card-title">
                  <span className="section-icon">{currentDossier.unlockedTier >= 3 ? '✓' : '🔒'}</span>
                  <span>ADVANCED FIELD HYPOTHESES (TIER 3)</span>
                </div>
                {currentDossier.unlockedTier >= 3 ? (
                  <ul className="hypotheses-list">
                    {currentDossier.lore.tier3Hypotheses.map((hyp, i) => (
                      <li key={i}>{hyp}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="section-body-text dim">
                    [CLASSIFIED // REQUIRES 3 EVIDENCE PIECES TO UNLOCK HYPOTHESES]
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Evidence Inventory */}
        {activeTab === 'evidence' && (
          <div className="journal-tab-content evidence-tab-content">
            {/* Category Filter Chips */}
            <div className="evidence-filters-scroll" role="toolbar" aria-label="Evidence Filters">
              <button
                type="button"
                className={`filter-chip ${evidenceFilterCategory === 'ALL' ? 'active' : ''}`}
                onClick={() => setEvidenceFilterCategory('ALL')}
              >
                ALL CATEGORIES
              </button>
              {Object.entries(EvidenceCategoryLabels).map(([catKey, catLabel]) => (
                <button
                  key={catKey}
                  type="button"
                  className={`filter-chip ${evidenceFilterCategory === catKey ? 'active' : ''}`}
                  onClick={() => setEvidenceFilterCategory(catKey)}
                >
                  {catLabel}
                </button>
              ))}
            </div>

            {/* Evidence List */}
            {filteredEvidence.length === 0 ? (
              <div className="journal-empty-state">
                <span className="empty-state-icon">🔬</span>
                <h4 className="empty-state-title">NO EVIDENCE CATALOGED YET</h4>
                <p className="empty-state-desc">
                  To catalog paranormal evidence, enter the scanner or radar, lock onto an anomaly on a physical surface, and maintain tracking between 0.8m and 3.5m while performing a frequency scan.
                </p>
              </div>
            ) : (
              <div className="evidence-cards-grid">
                {filteredEvidence.map((ev) => (
                  <div
                    key={ev.id}
                    className={`evidence-case-card ${!ev.reviewed ? 'unreviewed' : ''}`}
                    onClick={() => handleEvidenceClick(ev.id)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEvidenceClick(ev.id);
                    }}
                  >
                    <div className="evidence-card-header">
                      <span className="evidence-category-badge">
                        {EvidenceCategoryLabels[ev.category] || ev.category.toUpperCase()}
                      </span>
                      <div className="evidence-header-right">
                        <span className="evidence-confidence">{ev.confidence} CONFIDENCE</span>
                        {!ev.reviewed && <span className="evidence-new-dot" title="Unreviewed evidence">●</span>}
                      </div>
                    </div>

                    <h4 className="evidence-item-title">{ev.title}</h4>
                    <p className="evidence-item-description">{ev.description}</p>

                    <div className="evidence-card-footer">
                      <span className="evidence-quality-tag">{ev.quality} QUALITY</span>
                      <span className="evidence-timestamp">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Timeline & Encounter Log */}
        {activeTab === 'timeline' && (
          <div className="journal-tab-content timeline-tab-content">
            {journalData.encounters.length === 0 ? (
              <div className="journal-empty-state">
                <span className="empty-state-icon">⏳</span>
                <h4 className="empty-state-title">NO ENCOUNTER LOGS RECORDED</h4>
                <p className="empty-state-desc">
                  Encounter timelines are automatically archived here after you engage an anomaly and resolve a frequency scan or dissolve an encounter.
                </p>
              </div>
            ) : (
              <div className="timeline-vertical-flow">
                {journalData.encounters.map((enc, idx) => (
                  <div key={enc.encounterId || idx} className="timeline-log-entry">
                    <div className="timeline-dot-connector">
                      <span className="timeline-dot"></span>
                      {idx < journalData.encounters.length - 1 && <span className="timeline-line"></span>}
                    </div>

                    <div className="timeline-entry-card">
                      <div className="timeline-card-top">
                        <span className="timeline-entity-name">{enc.entityName}</span>
                        <span className={`timeline-outcome-pill outcome-${enc.outcome?.toLowerCase()}`}>
                          {enc.outcome}
                        </span>
                      </div>

                      <div className="timeline-card-meta">
                        <span>DURATION: {enc.durationSeconds}s</span>
                        <span>{new Date(enc.timestamp).toLocaleString()}</span>
                      </div>

                      {enc.evidenceAwarded && enc.evidenceAwarded.length > 0 && (
                        <div className="timeline-evidence-awarded">
                          <span className="awarded-label">EVIDENCE FILED:</span>
                          <span className="awarded-names">
                            {enc.evidenceAwarded.map((e) => e.title).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
