import React from 'react';
import { getAllEntities } from '../ar/entities/EntityRegistry';
import { isEntityDiscovered, getDiscoveredEntities } from '../services/discoveryStorage';
import { getJournalData } from '../services/investigationStorage';
import { soundEffects } from '../services/soundEffects';
import CreatureSilhouette from './CreatureSilhouette';

export default function EntitySelector({
  selectedEntityId,
  onSelectEntity,
  onClose,
  isOpen,
}) {
  if (!isOpen) return null;

  const entities = getAllEntities();
  const discoveries = getDiscoveredEntities();
  const journal = getJournalData();

  const handleSelect = (entity) => {
    soundEffects.playButtonBeep(880, 0.06);
    onSelectEntity(entity);
  };

  const getEntityAccent = (id) => {
    if (id?.includes('drifter')) return 'drifter-accent';
    if (id?.includes('crawler')) return 'crawler-accent';
    return 'watcher-accent';
  };

  return (
    <div
      className="entity-selector-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entity-selector-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="entity-selector-sheet">
        {/* Modal Handle & Header */}
        <div className="sheet-drag-handle" aria-hidden="true"></div>

        <header className="entity-selector-header">
          <div className="selector-title-cluster">
            <span className="selector-badge-tag">SPECTRAL FREQUENCY CODEX</span>
            <h2 id="entity-selector-title" className="selector-main-heading">
              SELECT ANOMALY TARGET
            </h2>
          </div>
          <button
            type="button"
            className="selector-close-icon-btn"
            onClick={onClose}
            title="Close Codex"
          >
            ✕
          </button>
        </header>

        <p className="selector-subtext">
          Tune optical scanner receiver to synchronize with specific metaphysical rift frequencies:
        </p>

        {/* Entity Cards Stack */}
        <div className="entity-cards-scrollable">
          {entities.map((entity) => {
            const isSelected = entity.id === selectedEntityId;
            const discovered = isEntityDiscovered(entity.id);
            const discoveryData = discoveries[entity.id];
            const evidenceCount = journal.evidence
              ? journal.evidence.filter((ev) => ev.entityId === entity.id).length
              : 0;
            const accentClass = getEntityAccent(entity.id);

            return (
              <div
                key={entity.id}
                className={`entity-codex-card ${accentClass} ${isSelected ? 'selected-card' : ''}`}
                onClick={() => handleSelect(entity)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(entity);
                  }
                }}
              >
                {/* Left Visual Silhouette Thumbnail */}
                <div className="codex-card-visual">
                  <CreatureSilhouette
                    entityId={entity.id}
                    size="small"
                    animate={isSelected}
                  />
                  <div className="visual-scanline-fx" aria-hidden="true"></div>
                </div>

                {/* Right Details Block */}
                <div className="codex-card-content">
                  <div className="codex-top-row">
                    <span className="codex-code-mono">{entity.code}</span>
                    <div className="codex-discovery-pill">
                      {discovered ? (
                        <span className="pill-status confirmed">
                          ✓ DISCOVERED ({discoveryData?.scanCount || 1}x)
                        </span>
                      ) : (
                        <span className="pill-status undiscovered">
                          ? UNCATALOGED
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="codex-entity-name">{entity.name}</h3>

                  <div className="codex-meta-row">
                    <span className="codex-type-tag">{entity.classification}</span>
                    <span className={`codex-threat-tag threat-${entity.threat?.toLowerCase()}`}>
                      {entity.threat}
                    </span>
                    <span className="codex-res-tag">{entity.resonance}</span>
                  </div>

                  <p className="codex-desc-text">{entity.description}</p>

                  {/* Evidence & Lock Button Row */}
                  <div className="codex-bottom-action-row">
                    <div className="codex-evidence-progress">
                      <span className="progress-k">EVIDENCE:</span>
                      <span className="progress-v">{evidenceCount} FILED</span>
                    </div>

                    <button
                      type="button"
                      className={`codex-lock-btn ${isSelected ? 'is-active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(entity);
                      }}
                    >
                      {isSelected ? '✓ FREQUENCY LOCKED' : 'LOCK TARGET'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <footer className="entity-selector-footer">
          <button
            type="button"
            className="selector-confirm-btn"
            onClick={onClose}
          >
            CONFIRM SELECTION
          </button>
        </footer>
      </div>
    </div>
  );
}
