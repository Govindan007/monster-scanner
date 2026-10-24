/**
 * VEIL // Phase 5 Investigation Storage Service
 * Manages persistence for paranormal evidence, encounter timelines,
 * and progressive dossier unlocks using validated localStorage.
 *
 * Preserves existing 'veil_entity_discoveries_v1' and stores investigation
 * records under 'veil_investigation_journal_v1'.
 */

import {
  EVIDENCE_TEMPLATES,
  DOSSIER_TIERS,
  ENTITY_DOSSIERS_LORE,
} from '../data/investigationDefinitions';
import { getDiscoveredEntities } from './discoveryStorage';
import { getEntityById } from '../ar/entities/EntityRegistry';

const JOURNAL_STORAGE_KEY = 'veil_investigation_journal_v1';

/**
 * Returns safe empty structure if missing or corrupt
 */
function createEmptyJournal() {
  return {
    version: 1,
    encounters: [],
    evidence: [],
    dossierState: {
      'the-watcher': { unlockedTier: 0 },
      'the-drifter': { unlockedTier: 0 },
      'the-crawler': { unlockedTier: 0 },
    },
  };
}

/**
 * Validates and loads investigation journal data from localStorage
 */
export function getJournalData() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createEmptyJournal();
  }

  try {
    const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return createEmptyJournal();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn('InvestigationStorage: Invalid schema detected. Reinitializing.');
      return createEmptyJournal();
    }

    return {
      version: 1,
      encounters: Array.isArray(parsed.encounters) ? parsed.encounters : [],
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      dossierState: parsed.dossierState && typeof parsed.dossierState === 'object'
        ? parsed.dossierState
        : createEmptyJournal().dossierState,
    };
  } catch (err) {
    console.warn('InvestigationStorage: Read failure:', err);
    return createEmptyJournal();
  }
}

/**
 * Safely persists journal data to localStorage
 */
function saveJournalData(journal) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journal));
  } catch (err) {
    console.warn('InvestigationStorage: Write failure:', err);
  }
}

/**
 * Computes the unlocked tier based on collected evidence count for an entity
 */
export function calculateUnlockedTier(evidenceCount) {
  let tier = 0;
  for (const t of DOSSIER_TIERS) {
    if (evidenceCount >= t.requiredEvidenceCount) {
      tier = t.tier;
    }
  }
  return tier;
}

/**
 * Records an encounter in the investigation journal timeline
 */
export function recordEncounterLog({
  encounterId,
  entityId,
  entityName,
  outcome = 'RESOLVED',
  durationSeconds = 0,
  evidenceAwarded = [],
}) {
  if (!encounterId || !entityId) return null;

  const journal = getJournalData();

  // Prevent duplicate encounter logging with identical ID
  const exists = journal.encounters.some((e) => e.encounterId === encounterId);
  if (exists) return null;

  const logEntry = {
    encounterId,
    entityId,
    entityName: entityName || entityId.toUpperCase(),
    timestamp: new Date().toISOString(),
    outcome,
    durationSeconds: Math.round(durationSeconds),
    evidenceAwarded: Array.isArray(evidenceAwarded) ? evidenceAwarded : [],
  };

  journal.encounters.unshift(logEntry); // Newest first
  // Keep last 50 encounters to avoid bloating localStorage
  if (journal.encounters.length > 50) {
    journal.encounters = journal.encounters.slice(0, 50);
  }

  saveJournalData(journal);
  return logEntry;
}

/**
 * Awards paranormal evidence based on encounter triggers.
 * Prevents duplicate rewards for the same template within the same entity.
 */
export function awardEvidence(entityId, encounterId, triggerType = 'RESOLVED') {
  if (!entityId || !encounterId) return null;

  const journal = getJournalData();

  // Find candidate templates for this entity matching trigger
  const candidates = EVIDENCE_TEMPLATES.filter(
    (t) => t.entityId === entityId && t.trigger === triggerType
  );

  if (candidates.length === 0) return null;

  // Filter out templates already collected by the player
  const uncollected = candidates.filter((c) =>
    !journal.evidence.some((e) => e.templateId === c.templateId && e.entityId === entityId)
  );

  // If player already has all matching candidate evidence, give no duplicate
  if (uncollected.length === 0) return null;

  // Pick the first uncollected evidence piece
  const chosen = uncollected[0];

  const newEvidence = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    templateId: chosen.templateId,
    entityId,
    encounterId,
    category: chosen.category,
    title: chosen.title,
    description: chosen.description,
    quality: chosen.quality,
    confidence: chosen.confidence,
    timestamp: new Date().toISOString(),
    reviewed: false, // unreviewed indicator
  };

  journal.evidence.unshift(newEvidence);

  // Recalculate dossier unlocked tier for this entity
  const entityEvidenceCount = journal.evidence.filter((e) => e.entityId === entityId).length;
  const newTier = calculateUnlockedTier(entityEvidenceCount);

  if (!journal.dossierState[entityId]) {
    journal.dossierState[entityId] = { unlockedTier: 0 };
  }
  journal.dossierState[entityId].unlockedTier = newTier;

  saveJournalData(journal);
  return newEvidence;
}

/**
 * Marks a specific piece of evidence as reviewed
 */
export function markEvidenceReviewed(evidenceId) {
  if (!evidenceId) return;
  const journal = getJournalData();
  let changed = false;

  journal.evidence = journal.evidence.map((item) => {
    if (item.id === evidenceId && !item.reviewed) {
      changed = true;
      return { ...item, reviewed: true };
    }
    return item;
  });

  if (changed) {
    saveJournalData(journal);
  }
}

/**
 * Marks all evidence as reviewed
 */
export function markAllEvidenceReviewed() {
  const journal = getJournalData();
  journal.evidence = journal.evidence.map((item) => ({ ...item, reviewed: true }));
  saveJournalData(journal);
}

/**
 * Returns total count of unreviewed evidence pieces across all entities
 */
export function getUnreviewedEvidenceCount() {
  const journal = getJournalData();
  return journal.evidence.filter((e) => !e.reviewed).length;
}

/**
 * Compiles a rich, progressive dossier for a specific creature
 */
export function getEntityDossier(entityId) {
  const entityDef = getEntityById(entityId);
  if (!entityDef) return null;

  const discoveries = getDiscoveredEntities();
  const discoveryRecord = discoveries[entityId] || null;
  const isDiscovered = Boolean(discoveryRecord && discoveryRecord.discovered);

  const journal = getJournalData();
  const collectedEvidence = journal.evidence.filter((e) => e.entityId === entityId);
  const encounterLogs = journal.encounters.filter((e) => e.entityId === entityId);

  const unlockedTier = calculateUnlockedTier(collectedEvidence.length);
  const lore = ENTITY_DOSSIERS_LORE[entityId] || {};

  return {
    entityId,
    name: entityDef.name,
    code: entityDef.code,
    classification: entityDef.classification,
    threat: entityDef.threat,
    resonance: entityDef.resonance,
    description: entityDef.description,
    isDiscovered,
    scanCount: discoveryRecord?.scanCount || 0,
    firstDiscoveredAt: discoveryRecord?.firstDiscoveredAt || null,
    lastScannedAt: discoveryRecord?.lastScannedAt || null,
    unlockedTier,
    maxTiers: DOSSIER_TIERS.length,
    evidenceCollected: collectedEvidence,
    encounterLogs,
    lore: {
      origin: isDiscovered ? lore.origin : '[CLASSIFIED // INITIAL DISCOVERY REQUIRED]',
      tier1Lore: unlockedTier >= 1 ? lore.tier1Lore : '[CLASSIFIED // COLLECT 1 EVIDENCE TO UNLOCK]',
      tier2Lore: unlockedTier >= 2 ? lore.tier2Lore : '[CLASSIFIED // COLLECT 2 EVIDENCE TO UNLOCK]',
      tier3Hypotheses: unlockedTier >= 3 ? lore.tier3Hypotheses : [],
      unresolvedQuestions: unlockedTier >= 2 ? lore.unresolvedQuestions : [],
    },
  };
}

/**
 * Resets investigation journal data
 */
export function clearAllJournalData() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(JOURNAL_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
