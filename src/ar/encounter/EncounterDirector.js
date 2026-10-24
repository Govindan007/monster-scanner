/**
 * VEIL // Phase 4 Encounter Director
 * Reusable encounter controller and state machine for AR horror entities.
 * Enforces explicit states, validated transitions, single-commit guards,
 * deterministic scan outcomes, and clean resource lifecycle.
 */

import { awardEvidence, recordEncounterLog } from '../../services/investigationStorage';

export const EncounterState = Object.freeze({
  DORMANT: 'DORMANT',
  APPEARING: 'APPEARING',
  OBSERVING: 'OBSERVING',
  DISTURBED: 'DISTURBED',
  SCANNING: 'SCANNING',
  RESOLVED: 'RESOLVED',
  ESCAPING: 'ESCAPING',
});

export const ScanOutcome = Object.freeze({
  SUCCESS: 'SUCCESS',
  SIGNAL_LOST: 'SIGNAL_LOST',
  INTERRUPTED: 'INTERRUPTED',
  CANCELLED: 'CANCELLED',
});

export class EncounterDirector {
  constructor({
    onStateChange = null,
    onScanProgress = null,
    onScanOutcome = null,
    onEncounterResolved = null,
    onEncounterEscaped = null,
    onEvidenceAwarded = null,
  } = {}) {
    this.state = EncounterState.DORMANT;
    this.previousState = null;
    this.stateTime = 0;

    // Callbacks
    this.onStateChange = onStateChange;
    this.onScanProgress = onScanProgress;
    this.onScanOutcome = onScanOutcome;
    this.onEncounterResolved = onEncounterResolved;
    this.onEncounterEscaped = onEncounterEscaped;
    this.onEvidenceAwarded = onEvidenceAwarded;

    // Active encounter references
    this.activeEntity = null;
    this.activeEntityDef = null;
    this.currentEncounterId = null;
    this._evidenceAwardedThisEncounter = [];
    this._encounterStartTime = 0;
    this._hasDisturbedEvidenceAwarded = false;

    // Scan management
    this.isScanning = false;
    this.scanProgress = 0;
    this.scanDuration = 2000;
    this.scanTimer = null;
    this._isResultCommitted = false;

    // Distance tracking for deterministic AR scanning
    this.currentDistance = 0;
    this.minScanDistance = 0.5; // too close causes psychic feedback
    this.maxScanDistance = 4.2; // too far decouples resonance lock

    // Timers
    this.appearanceTimer = null;
    this.calmTimer = null;
    this.escapeTimer = null;
  }

  /**
   * Current state getter
   */
  getState() {
    return this.state;
  }

  /**
   * Check if state transition is legally permitted
   */
  canTransitionTo(nextState) {
    if (this.state === nextState) return false;

    switch (this.state) {
      case EncounterState.DORMANT:
        return nextState === EncounterState.APPEARING;

      case EncounterState.APPEARING:
        return nextState === EncounterState.OBSERVING || nextState === EncounterState.ESCAPING;

      case EncounterState.OBSERVING:
        return (
          nextState === EncounterState.DISTURBED ||
          nextState === EncounterState.SCANNING ||
          nextState === EncounterState.ESCAPING
        );

      case EncounterState.DISTURBED:
        return (
          nextState === EncounterState.OBSERVING ||
          nextState === EncounterState.SCANNING ||
          nextState === EncounterState.ESCAPING
        );

      case EncounterState.SCANNING:
        return (
          nextState === EncounterState.RESOLVED ||
          nextState === EncounterState.DISTURBED ||
          nextState === EncounterState.ESCAPING
        );

      case EncounterState.RESOLVED:
        return nextState === EncounterState.ESCAPING || nextState === EncounterState.DORMANT;

      case EncounterState.ESCAPING:
        return nextState === EncounterState.DORMANT;

      default:
        return false;
    }
  }

  /**
   * Transition to next state with lifecycle event notification
   */
  transitionTo(nextState, context = {}) {
    if (!this.canTransitionTo(nextState)) {
      console.warn(`EncounterDirector: Illegal transition from ${this.state} to ${nextState}`);
      return false;
    }

    const prev = this.state;
    this.previousState = prev;
    this.state = nextState;
    this.stateTime = 0;

    // Propagate state to active 3D entity if supported
    if (this.activeEntity && typeof this.activeEntity.setEncounterState === 'function') {
      this.activeEntity.setEncounterState(nextState);
    }

    if (this.onStateChange) {
      this.onStateChange(nextState, prev, context);
    }

    return true;
  }

  /**
   * Manifests a new entity on a detected surface
   */
  startEncounter(entity, entityDef) {
    if (this.state !== EncounterState.DORMANT) {
      console.warn('EncounterDirector: Cannot start encounter while already active');
      return false;
    }

    this.clearAllTimers();
    this.activeEntity = entity;
    this.activeEntityDef = entityDef;
    this.currentEncounterId = `enc_${entityDef?.id || 'entity'}_${Date.now()}`;
    this._evidenceAwardedThisEncounter = [];
    this._encounterStartTime = Date.now();
    this._hasDisturbedEvidenceAwarded = false;
    this.scanDuration = entityDef?.scanDuration || 2000;
    this._isResultCommitted = false;
    this.scanProgress = 0;

    this.transitionTo(EncounterState.APPEARING, { entity, entityDef });

    // Transition from APPEARING to OBSERVING after manifestation window (~1.2s)
    this.appearanceTimer = setTimeout(() => {
      this.appearanceTimer = null;
      if (this.state === EncounterState.APPEARING) {
        this.transitionTo(EncounterState.OBSERVING);
      }
    }, 1200);

    return true;
  }

  /**
   * Triggers agitated state on the creature
   */
  triggerDisturbed(reason = 'USER_PROXIMITY') {
    if (this.state === EncounterState.OBSERVING) {
      this.transitionTo(EncounterState.DISTURBED, { reason });

      // Award behavioural evidence on first disturbance
      if (!this._hasDisturbedEvidenceAwarded && this.activeEntityDef) {
        this._hasDisturbedEvidenceAwarded = true;
        const ev = awardEvidence(this.activeEntityDef.id, this.currentEncounterId, 'DISTURBED');
        if (ev) {
          this._evidenceAwardedThisEncounter.push(ev);
          if (this.onEvidenceAwarded) this.onEvidenceAwarded(ev);
        }
      }

      // Automatically calm down to OBSERVING after 3.8s if no scan occurs
      if (this.calmTimer) clearTimeout(this.calmTimer);
      this.calmTimer = setTimeout(() => {
        this.calmTimer = null;
        if (this.state === EncounterState.DISTURBED) {
          this.transitionTo(EncounterState.OBSERVING);
        }
      }, 3800);
      return true;
    }
    return false;
  }

  /**
   * Begins deterministic active scanning of the placed entity
   */
  startScan({ onProgress = null, onComplete = null, onFail = null } = {}) {
    if (this.state !== EncounterState.OBSERVING && this.state !== EncounterState.DISTURBED) {
      console.warn(`EncounterDirector: Cannot scan from state ${this.state}`);
      return false;
    }

    if (this.isScanning) {
      return false; // prevent duplicate scanning
    }

    if (this.calmTimer) {
      clearTimeout(this.calmTimer);
      this.calmTimer = null;
    }

    this.isScanning = true;
    this.scanProgress = 0;
    this.transitionTo(EncounterState.SCANNING);

    const stepIntervalMs = 50;
    const totalDuration = this.scanDuration;
    const progressPerStep = (stepIntervalMs / totalDuration) * 100;

    this.scanTimer = setInterval(() => {
      // Deterministic validation: Check distance during scan
      if (this.currentDistance > this.maxScanDistance) {
        // Player moved too far away: scan fails due to resonance signal loss!
        this.failScan(ScanOutcome.SIGNAL_LOST, 'Distance exceeded max tracking range (> 4.2m)', onFail);
        return;
      }

      this.scanProgress = Math.min(100, this.scanProgress + progressPerStep);

      if (onProgress) {
        onProgress(Math.floor(this.scanProgress));
      }
      if (this.onScanProgress) {
        this.onScanProgress(Math.floor(this.scanProgress));
      }

      if (this.scanProgress >= 100) {
        clearInterval(this.scanTimer);
        this.scanTimer = null;
        this.isScanning = false;
        this.resolveScan(onComplete);
      }
    }, stepIntervalMs);

    return true;
  }

  /**
   * Cancels active scan manually or due to interruption
   */
  cancelScan(reason = ScanOutcome.CANCELLED, onFail = null) {
    if (!this.isScanning) return;
    this.failScan(reason, 'Scan was aborted by user or environment', onFail);
  }

  /**
   * Internal failure handling with deterministic outcome
   */
  failScan(outcome, reasonText, onFail = null) {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    this.isScanning = false;
    this.scanProgress = 0;

    if (this.onScanOutcome) {
      this.onScanOutcome({
        outcome,
        success: false,
        reason: reasonText,
        entity: this.activeEntityDef,
      });
    }

    if (onFail) {
      onFail({ outcome, reason: reasonText });
    }

    // Creature escapes when scan is broken/lost
    this.escapeEncounter(reasonText);
  }

  /**
   * Commits successful scan result exactly once
   */
  resolveScan(onComplete = null) {
    if (this._isResultCommitted) {
      return; // prevent duplicate commit
    }
    this._isResultCommitted = true;

    // Award evidence for resolving scan
    if (this.activeEntityDef) {
      const ev = awardEvidence(this.activeEntityDef.id, this.currentEncounterId, 'RESOLVED');
      if (ev) {
        this._evidenceAwardedThisEncounter.push(ev);
        if (this.onEvidenceAwarded) this.onEvidenceAwarded(ev);
      }
    }

    this.transitionTo(EncounterState.RESOLVED);

    const result = {
      outcome: ScanOutcome.SUCCESS,
      success: true,
      id: this.activeEntityDef?.id || 'unknown',
      name: this.activeEntityDef?.name || this.activeEntity?.name || 'ANOMALY',
      code: this.activeEntityDef?.code || this.activeEntity?.code || 'VOID-???',
      threat: this.activeEntityDef?.threat || this.activeEntity?.threat || 'UNKNOWN',
      resonance: this.activeEntityDef?.resonance || this.activeEntity?.resonance || '000.0 MHz',
      behaviorSummary: this.activeEntityDef?.behaviorSummary || 'ENTITY OBSERVED',
      timestamp: new Date().toISOString(),
      evidenceAwarded: [...this._evidenceAwardedThisEncounter],
    };

    if (this.onScanOutcome) {
      this.onScanOutcome(result);
    }
    if (this.onEncounterResolved) {
      this.onEncounterResolved(result);
    }
    if (onComplete) {
      onComplete(result);
    }
  }

  /**
   * Initiates entity departure / dispersal with clean 3D dissolution
   */
  escapeEncounter(reason = 'ENCOUNTER_CONCLUDED', onComplete = null) {
    if (this.state === EncounterState.ESCAPING || this.state === EncounterState.DORMANT) {
      return;
    }

    // Award dispersal/escape evidence if applicable
    if (this.activeEntityDef && this._isResultCommitted) {
      const ev = awardEvidence(this.activeEntityDef.id, this.currentEncounterId, 'ESCAPED');
      if (ev) {
        this._evidenceAwardedThisEncounter.push(ev);
        if (this.onEvidenceAwarded) this.onEvidenceAwarded(ev);
      }
    }

    // Record encounter log in journal timeline
    const duration = (Date.now() - (this._encounterStartTime || Date.now())) / 1000;
    recordEncounterLog({
      encounterId: this.currentEncounterId,
      entityId: this.activeEntityDef?.id || 'unknown',
      entityName: this.activeEntityDef?.name || 'UNKNOWN ENTITY',
      outcome: this._isResultCommitted ? 'RESOLVED' : (reason === 'USER_PURGE' ? 'DISPERSED' : 'SIGNAL_LOST'),
      durationSeconds: duration,
      evidenceAwarded: [...this._evidenceAwardedThisEncounter],
    });

    this.clearAllTimers();
    this.isScanning = false;
    this.transitionTo(EncounterState.ESCAPING, { reason });

    const entityToEscape = this.activeEntity;

    if (entityToEscape && typeof entityToEscape.triggerDissolve === 'function') {
      entityToEscape.triggerDissolve(() => {
        this._finishDispersal(onComplete);
      });
    } else {
      this._finishDispersal(onComplete);
    }
  }

  _finishDispersal(onComplete = null) {
    if (this.activeEntity && typeof this.activeEntity.dispose === 'function') {
      this.activeEntity.dispose();
    }
    this.activeEntity = null;
    this.activeEntityDef = null;
    this.transitionTo(EncounterState.DORMANT);

    if (this.onEncounterEscaped) {
      this.onEncounterEscaped();
    }
    if (onComplete) {
      onComplete();
    }
  }

  /**
   * Per-frame update method called from ARManager render loop
   */
  update(elapsedTime, delta, cameraWorldPos) {
    this.stateTime += delta;

    if (this.activeEntity && cameraWorldPos && this.activeEntity.root) {
      this.currentDistance = cameraWorldPos.distanceTo(this.activeEntity.root.position);

      // Horror Proximity Trigger: If player approaches very close (< 1.1m) during OBSERVING, disturb creature
      if (this.state === EncounterState.OBSERVING && this.currentDistance < 1.1) {
        this.triggerDisturbed('CLOSE_PROXIMITY');
      }

      // Propagate animation update to entity with active encounter state
      if (typeof this.activeEntity.update === 'function') {
        this.activeEntity.update(elapsedTime, delta, cameraWorldPos, this.state);
      }
    }
  }

  /**
   * Clean all pending timers
   */
  clearAllTimers() {
    if (this.appearanceTimer) {
      clearTimeout(this.appearanceTimer);
      this.appearanceTimer = null;
    }
    if (this.calmTimer) {
      clearTimeout(this.calmTimer);
      this.calmTimer = null;
    }
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.escapeTimer) {
      clearTimeout(this.escapeTimer);
      this.escapeTimer = null;
    }
  }

  /**
   * Total cleanup when AR session ends or component unmounts
   */
  dispose() {
    this.clearAllTimers();
    if (this.activeEntity) {
      if (typeof this.activeEntity.dispose === 'function') {
        this.activeEntity.dispose();
      }
      this.activeEntity = null;
    }
    this.activeEntityDef = null;
    this.state = EncounterState.DORMANT;
    this.isScanning = false;
  }
}
