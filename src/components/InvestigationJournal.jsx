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

export default function InvestigationJournal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('dossiers'); // 'dossiers' | 'evidence' | 'timeline'
  const [selectedEntityId, setSelectedEntityId] = useState('the-watcher');
  const [evidenceFilterCategory, setEvidenceFilterCategory] = useState('ALL');
  const [evidenceFilterEntity, setEvidenceFilterEntity] = useState('ALL');

  // Journal data snapshot state
  const [journalData, setJournalData] = useState(() => getJournalData());
  const [unreviewedCount, setUnreviewedCount] = useState(() => getUnreviewedEvidenceCount());

  // Refresh journal data when opened
  useEffect(() => {
    if (isOpen) {
      setJournalData(getJournalData());
      setUnreviewedCount(getUnreviewedEvidenceCount());
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
    <div className="journal-modal-overlay" role="dialog" aria-modal="true" aria-label="Investigation Journal">
      <div className="journal-modal-backdrop" onClick={onClose}></div>

      <div className="journal-modal-card">
        {/* Header */}
        <header className="journal-header">
          <div className="journal-title-box">
            <span className="journal-badge">CLASSIFIED REPOSITORY // LEVEL 3 CLEARANCE</span>
            <h2 className="journal-title">INVESTIGATION JOURNAL</h2>
          </div>

          <div className="journal-header-actions">
            {unreviewedCount > 0 && (
              <button
                className="journal-mark-all-btn"
                onClick={handleMarkAllReviewed}
                title="Mark all evidence as reviewed"
              >
                ✓ REVIEW ALL ({unreviewedCount})
              </button>
            )}
            <button className="journal-close-btn" onClick={onClose} aria-label="Close Journal">
              ✕
            </button>
          </div>
        </header>

        {/* Primary Navigation Tabs */}
        <nav className="journal-tabs">
          <button
            className={`journal-tab-btn ${activeTab === 'dossiers' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('dossiers');
              soundEffects.playButtonBeep(520, 0.04);
            }}
          >
            <span>📁 ENTITY DOSSIERS</span>
          </button>
          <button
            className={`journal-tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('evidence');
              soundEffects.playButtonBeep(520, 0.04);
            }}
          >
            <span>🔬 EVIDENCE INVENTORY</span>
            {unreviewedCount > 0 && <span className="journal-tab-unread-pill">{unreviewedCount}</span>}
          </button>
          <button
            className={`journal-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('timeline');
              soundEffects.playButtonBeep(520, 0.04);
            }}
          >
            <span>⏳ TIMELINE</span>
            <span className="journal-tab-count">({journalData.encounters.length})</span>
          </button>
        </nav>

        {/* Content Body */}
        <div className="journal-body">
          {/* TAB 1: ENTITY DOSSIERS */}
          {activeTab === 'dossiers' && (
            <div className="journal-dossiers-view">
              {/* Entity Picker Pills */}
              <div className="dossier-entity-selector">
                {allEntities.map((ent) => {
                  const d = getEntityDossier(ent.id);
                  const isCurrent = ent.id === selectedEntityId;
                  return (
                    <button
                      key={ent.id}
                      className={`dossier-select-pill ${isCurrent ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedEntityId(ent.id);
                        soundEffects.playButtonBeep(640, 0.04);
                      }}
                    >
                      <span className="pill-dot" style={{ backgroundColor: isCurrent ? 'var(--veil-cyan)' : 'rgba(255,255,255,0.3)' }}></span>
                      <span className="pill-name">{ent.name}</span>
                      <span className="pill-tier">T{d.unlockedTier}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dossier Detail Card */}
              {currentDossier && (
                <div className="dossier-content-card">
                  {/* Dossier Header */}
                  <div className="dossier-card-top">
                    <div>
                      <div className="dossier-designation">{currentDossier.code}</div>
                      <h3 className="dossier-entity-name">{currentDossier.name}</h3>
                      <div className="dossier-class-tag">{currentDossier.classification}</div>
                    </div>
                    <div className="dossier-status-box">
                      <span className={`dossier-disc-badge ${currentDossier.isDiscovered ? 'disc' : 'undisc'}`}>
                        {currentDossier.isDiscovered ? 'DISCOVERED' : 'UNDISCOVERED'}
                      </span>
                      <span className="dossier-scan-count">SCANS: {currentDossier.scanCount}</span>
                    </div>
                  </div>

                  {/* Progressive Unlock Progress Bar */}
                  <div className="dossier-progression-bar-box">
                    <div className="progression-bar-header">
                      <span>INVESTIGATION PROGRESSION: TIER {currentDossier.unlockedTier} / {currentDossier.maxTiers}</span>
                      <span>{currentDossier.evidenceCollected.length} EVIDENCE LOGGED</span>
                    </div>
                    <div className="progression-track">
                      <div
                        className="progression-fill"
                        style={{ width: `${(currentDossier.unlockedTier / currentDossier.maxTiers) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Section 1: Classification & Origin */}
                  <div className="dossier-section">
                    <h4 className="dossier-section-title">01 // CLASSIFICATION & ORIGIN</h4>
                    <p className="dossier-text">{currentDossier.description}</p>
                    <div className="dossier-lore-callout">
                      <span className="callout-label">METAPHYSICAL MANIFESTATION:</span>
                      <p className="callout-text">{currentDossier.lore.origin}</p>
                    </div>
                  </div>

                  {/* Section 2: Progressive Field Lore */}
                  <div className="dossier-section">
                    <h4 className="dossier-section-title">02 // FIELD ANALYSIS (TIER 1 & 2)</h4>
                    <div className="dossier-lore-block">
                      <div className="lore-tier-tag">TIER 1 PROFILE:</div>
                      <p className="dossier-text">{currentDossier.lore.tier1Lore}</p>
                    </div>
                    <div className="dossier-lore-block">
                      <div className="lore-tier-tag">TIER 2 BEHAVIORAL ANALYSIS:</div>
                      <p className="dossier-text">{currentDossier.lore.tier2Lore}</p>
                    </div>
                  </div>

                  {/* Section 3: In-Game Hypotheses & Unresolved Questions (Tier 3) */}
                  <div className="dossier-section">
                    <h4 className="dossier-section-title">03 // FIELD HYPOTHESES & UNRESOLVED PHENOMENA</h4>
                    {currentDossier.unlockedTier >= 3 ? (
                      <div className="dossier-hypotheses-list">
                        <div className="hypotheses-disclaimer">
                          ⚠ THEORETICAL IN-GAME HYPOTHESES (UNVERIFIED METAPHYSICAL CONJECTURE):
                        </div>
                        {currentDossier.lore.tier3Hypotheses.map((hyp, i) => (
                          <div key={i} className="hypothesis-item">
                            <span className="hyp-bullet">◈</span>
                            <span>{hyp}</span>
                          </div>
                        ))}

                        <div className="unresolved-box">
                          <span className="unresolved-label">UNRESOLVED RESEARCH QUESTIONS:</span>
                          <ul>
                            {currentDossier.lore.unresolvedQuestions.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="dossier-classified-notice">
                        <span className="lock-icon">🔒</span>
                        <span>[CLASSIFIED // COLLECT 3 EVIDENCE ITEMS TO UNLOCK FIELD HYPOTHESES]</span>
                      </div>
                    )}
                  </div>

                  {/* Section 4: Attached Evidence Files */}
                  <div className="dossier-section">
                    <h4 className="dossier-section-title">
                      04 // ATTACHED EVIDENCE ({currentDossier.evidenceCollected.length})
                    </h4>
                    {currentDossier.evidenceCollected.length > 0 ? (
                      <div className="dossier-evidence-grid">
                        {currentDossier.evidenceCollected.map((ev) => (
                          <div
                            key={ev.id}
                            className={`dossier-evidence-item ${!ev.reviewed ? 'unreviewed' : ''}`}
                            onClick={() => handleEvidenceClick(ev.id)}
                          >
                            <div className="ev-item-header">
                              <span className="ev-item-cat">{EvidenceCategoryLabels[ev.category] || ev.category}</span>
                              {!ev.reviewed && <span className="ev-new-tag">NEW</span>}
                            </div>
                            <div className="ev-item-title">{ev.title}</div>
                            <div className="ev-item-meta">CONFIDENCE: {ev.confidence} | {ev.quality}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-sub-state">
                        NO PARANORMAL EVIDENCE CATALOGUED YET. DEPLOY SENSORS AND SCAN CREATURE TO HARVEST TRACES.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EVIDENCE INVENTORY */}
          {activeTab === 'evidence' && (
            <div className="journal-evidence-view">
              {/* Filter controls */}
              <div className="evidence-filter-bar">
                <div className="filter-group">
                  <span className="filter-label">ENTITY:</span>
                  <select
                    className="journal-select"
                    value={evidenceFilterEntity}
                    onChange={(e) => setEvidenceFilterEntity(e.target.value)}
                  >
                    <option value="ALL">ALL ENTITIES</option>
                    {allEntities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <span className="filter-label">CATEGORY:</span>
                  <select
                    className="journal-select"
                    value={evidenceFilterCategory}
                    onChange={(e) => setEvidenceFilterCategory(e.target.value)}
                  >
                    <option value="ALL">ALL CATEGORIES</option>
                    {Object.entries(EvidenceCategoryLabels).map(([catKey, catLabel]) => (
                      <option key={catKey} value={catKey}>
                        {catLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Evidence cards list */}
              {filteredEvidence.length > 0 ? (
                <div className="evidence-cards-list">
                  {filteredEvidence.map((ev) => (
                    <div
                      key={ev.id}
                      className={`evidence-card ${!ev.reviewed ? 'unreviewed' : ''}`}
                      onClick={() => handleEvidenceClick(ev.id)}
                    >
                      <div className="evidence-card-header">
                        <span className="ev-category-pill">
                          {EvidenceCategoryLabels[ev.category] || ev.category}
                        </span>
                        <div className="evidence-header-badges">
                          <span className={`ev-quality-badge quality-${ev.quality.toLowerCase()}`}>
                            {ev.quality}
                          </span>
                          {!ev.reviewed && <span className="ev-unreviewed-dot" title="Unreviewed evidence">NEW</span>}
                        </div>
                      </div>

                      <div className="evidence-card-title">{ev.title}</div>
                      <p className="evidence-card-desc">{ev.description}</p>

                      <div className="evidence-card-footer">
                        <span>ENTITY: {ev.entityId.toUpperCase()}</span>
                        <span>CONFIDENCE: {ev.confidence}</span>
                        <span>LOGGED: {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="journal-empty-state">
                  <div className="empty-icon">🔬</div>
                  <div className="empty-title">NO EVIDENCE MATCHING FILTER</div>
                  <p className="empty-desc">
                    Scan anomalies in real AR or camera mode to harvest spectral traces, energy signatures, and behavioural observations.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ENCOUNTER TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="journal-timeline-view">
              {journalData.encounters.length > 0 ? (
                <div className="timeline-list">
                  {journalData.encounters.map((enc) => (
                    <div key={enc.encounterId} className={`timeline-entry outcome-${enc.outcome.toLowerCase()}`}>
                      <div className="timeline-marker"></div>
                      <div className="timeline-entry-content">
                        <div className="timeline-top-row">
                          <span className="timeline-entity-name">{enc.entityName}</span>
                          <span className={`timeline-outcome-pill outcome-${enc.outcome.toLowerCase()}`}>
                            {enc.outcome}
                          </span>
                        </div>
                        <div className="timeline-meta-row">
                          <span>TIME: {new Date(enc.timestamp).toLocaleString()}</span>
                          <span>DURATION: {enc.durationSeconds}s</span>
                        </div>
                        {enc.evidenceAwarded && enc.evidenceAwarded.length > 0 && (
                          <div className="timeline-evidence-awarded">
                            <span className="dim-tag">EVIDENCE HARVESTED:</span>
                            {enc.evidenceAwarded.map((item) => (
                              <span key={item.id} className="timeline-ev-pill">
                                + {item.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="journal-empty-state">
                  <div className="empty-icon">⏳</div>
                  <div className="empty-title">NO ENCOUNTERS LOGGED YET</div>
                  <p className="empty-desc">
                    Manifest entities in real AR mode to begin documenting metaphysical encounters in your chronological mission log.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
