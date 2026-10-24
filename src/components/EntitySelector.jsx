import React from 'react';
import { getAllEntities } from '../ar/entities/EntityRegistry';
import { isEntityDiscovered, getDiscoveredEntities } from '../services/discoveryStorage';
import { soundEffects } from '../services/soundEffects';

/**
 * Mobile-friendly Entity Selector Modal / Panel
 * Allows selecting between The Watcher, The Drifter, and The Crawler,
 * displaying real-time discovery status, threat level, and visual description.
 */
export default function EntitySelector({
  selectedEntityId,
  onSelectEntity,
  onClose,
  isOpen,
}) {
  if (!isOpen) return null;

  const entities = getAllEntities();
  const discoveries = getDiscoveredEntities();

  const handleSelect = (entity) => {
    soundEffects.playButtonBeep(880, 0.08);
    onSelectEntity(entity);
  };

  return (
    <div className="entity-selector-overlay">
      <div className="entity-selector-card">
        {/* Header */}
        <div className="entity-selector-header">
          <div className="selector-title-badge">
            <span className="dot-cyan"></span>
            <span>ENTITY DATABASE // SPECTRAL REGISTRY</span>
          </div>
          <button className="selector-close-btn" onClick={onClose} title="Close Entity Selector">
            ✕ CLOSE
          </button>
        </div>

        <p className="selector-guidance">
          Select manifestation frequency to target for WebXR surface anchoring:
        </p>

        {/* Entity List */}
        <div className="entity-cards-container">
          {entities.map((entity) => {
            const isSelected = entity.id === selectedEntityId;
            const discovered = isEntityDiscovered(entity.id);
            const discoveryData = discoveries[entity.id];

            return (
              <div
                key={entity.id}
                className={`entity-select-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(entity)}
              >
                {/* Top Item Row */}
                <div className="entity-item-top">
                  <div className="entity-item-info">
                    <span className="entity-item-code">{entity.code}</span>
                    <h4 className="entity-item-name">{entity.name}</h4>
                  </div>
                  <div className="entity-item-status">
                    {discovered ? (
                      <span className="discovery-badge confirmed">
                        ✓ DISCOVERED ({discoveryData?.scanCount || 1}x)
                      </span>
                    ) : (
                      <span className="discovery-badge unknown">
                        ? UNDISCOVERED
                      </span>
                    )}
                  </div>
                </div>

                {/* Classification & Threat Grid */}
                <div className="entity-item-meta">
                  <span className="meta-tag">
                    <span className="dim">TYPE:</span> {entity.classification}
                  </span>
                  <span className="meta-tag">
                    <span className="dim">THREAT:</span>{' '}
                    <span className="threat-highlight">{entity.threat}</span>
                  </span>
                  <span className="meta-tag">
                    <span className="dim">FREQ:</span> {entity.resonance}
                  </span>
                </div>

                {/* Description snippet */}
                <p className="entity-item-desc">{entity.description}</p>

                {/* Select / Active Button */}
                <div className="entity-item-action">
                  <button
                    className={`cyber-button-sm ${isSelected ? 'active-selection' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(entity);
                    }}
                  >
                    {isSelected ? '✓ TARGET FREQUENCY LOCKED' : 'LOCK TARGET FREQUENCY'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="entity-selector-footer">
          <button className="cyber-button primary" onClick={onClose}>
            CONFIRM SELECTION
          </button>
        </div>
      </div>
    </div>
  );
}
