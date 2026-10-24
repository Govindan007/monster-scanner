/**
 * Discovery Persistence Service
 * Safely persists entity scan and encounter records to browser localStorage.
 * Handles missing, empty, or corrupted data gracefully with zero crashes.
 */

const STORAGE_KEY = 'veil_entity_discoveries_v1';

export function getDiscoveredEntities() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn('DiscoveryStorage: Malformed storage data detected. Resetting to empty.');
      window.localStorage.removeItem(STORAGE_KEY);
      return {};
    }
    return parsed;
  } catch (err) {
    console.warn('DiscoveryStorage: Failed to read from localStorage:', err);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return {};
  }
}

export function isEntityDiscovered(entityId) {
  if (!entityId) return false;
  const discoveries = getDiscoveredEntities();
  return Boolean(discoveries[entityId] && discoveries[entityId].discovered);
}

export function recordEntityDiscovery(entityId, entityMetadata = {}) {
  if (!entityId || typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const discoveries = getDiscoveredEntities();
    const existing = discoveries[entityId] || {
      entityId,
      scanCount: 0,
      firstDiscoveredAt: new Date().toISOString(),
    };

    const updated = {
      ...existing,
      ...entityMetadata,
      discovered: true,
      scanCount: (existing.scanCount || 0) + 1,
      lastScannedAt: new Date().toISOString(),
    };

    discoveries[entityId] = updated;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(discoveries));
    return updated;
  } catch (err) {
    console.warn('DiscoveryStorage: Failed to record discovery to localStorage:', err);
    return null;
  }
}

export function clearAllDiscoveries() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
