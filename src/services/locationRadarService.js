/**
 * VEIL — Phase 6: Location-Aware Anomaly Radar Service
 * Handles user-opt-in geolocation, deterministic virtual anomaly positioning,
 * distance & bearing mathematics (Haversine), proximity checks, and haptic cues.
 *
 * PRIVACY & SAFETY GUARANTEES:
 * 1. Zero network requests: Coordinates never leave the client device.
 * 2. No history stored: Exact GPS coordinates are never stored to disk.
 * 3. User opt-in: Geolocation is requested ONLY after explicit user consent.
 * 4. Fictional game mechanics: Clarifies that anomalies are virtual constructs.
 */

const SETTINGS_STORAGE_KEY = 'veil_radar_settings_v1';
const COOLDOWNS_STORAGE_KEY = 'veil_radar_cooldowns_v1';

// Default virtual baseline if location is disabled or in simulation
export const DEFAULT_SIMULATED_ORIGIN = {
  lat: 37.774929,
  lon: -122.419416,
  accuracy: 10,
  isSimulated: true,
};

// Base definitions of virtual anomaly nodes anchored relative to player origin (meters)
export const VIRTUAL_ANOMALY_TEMPLATES = [
  {
    id: 'ano-watcher-01',
    entityId: 'the-watcher',
    title: 'SPECTRAL VERTEX // RESIDUE CLUSTER',
    designation: 'ANO-V12',
    resonance: '104.2 MHz',
    threat: 'EXTREME',
    // Positioned ~30 meters North-East
    offset: { dx: 18, dy: 24 },
    detectionRadius: 160,
    encounterRadius: 30,
    cooldownMinutes: 4,
    description: 'Fixed high-frequency rift distortion. Visual inspection registers ocular fixation patterns.',
  },
  {
    id: 'ano-drifter-02',
    entityId: 'the-drifter',
    title: 'LEVITATING HARMONIC RIFT',
    designation: 'ANO-V49',
    resonance: '128.6 MHz',
    threat: 'HIGH',
    // Positioned ~58 meters North-West
    offset: { dx: -45, dy: 36 },
    detectionRadius: 180,
    encounterRadius: 30,
    cooldownMinutes: 5,
    description: 'Levitating harmonic distortion. Fluctuating field emissions registered above ground plane.',
  },
  {
    id: 'ano-crawler-03',
    entityId: 'the-crawler',
    title: 'SUB-SURFACE SEISMIC ANOMALY',
    designation: 'ANO-V77',
    resonance: '92.4 MHz',
    threat: 'CRITICAL',
    // Positioned ~75 meters South-East
    offset: { dx: 52, dy: -55 },
    detectionRadius: 200,
    encounterRadius: 35,
    cooldownMinutes: 6,
    description: 'Low-frequency planar vibration moving along subterranean threshold coordinates.',
  },
];

// In-memory active watch ID
let activeWatchId = null;
let lastHapticTime = 0;

/**
 * Loads radar user settings from localStorage
 */
export function getRadarSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        locationEnabled: false,
        hapticsEnabled: true,
        radarAudioEnabled: true,
        simulationOffsetMeters: 0, // Manual distance test slider
      };
    }
    const parsed = JSON.parse(raw);
    return {
      locationEnabled: Boolean(parsed.locationEnabled),
      hapticsEnabled: parsed.hapticsEnabled !== false,
      radarAudioEnabled: parsed.radarAudioEnabled !== false,
      simulationOffsetMeters: Number(parsed.simulationOffsetMeters) || 0,
    };
  } catch {
    return {
      locationEnabled: false,
      hapticsEnabled: true,
      radarAudioEnabled: true,
      simulationOffsetMeters: 0,
    };
  }
}

/**
 * Saves radar user settings to localStorage
 */
export function saveRadarSettings(settings) {
  try {
    const current = getRadarSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('[VEIL Location] Failed to save settings:', err);
    return settings;
  }
}

/**
 * Loads cooldown record from localStorage
 */
export function getAnomalyCooldowns() {
  try {
    const raw = localStorage.getItem(COOLDOWNS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Sets cooldown timestamp for an engaged anomaly
 */
export function recordAnomalyEngagement(anomalyId) {
  try {
    const cooldowns = getAnomalyCooldowns();
    cooldowns[anomalyId] = Date.now();
    localStorage.setItem(COOLDOWNS_STORAGE_KEY, JSON.stringify(cooldowns));
  } catch (err) {
    console.warn('[VEIL Location] Failed to save cooldown:', err);
  }
}

/**
 * Checks if Geolocation API is available on this browser
 */
export function isGeolocationAvailable() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

/**
 * Requests one-shot GPS fix after explicit user initiation
 */
export function requestCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!isGeolocationAvailable()) {
      reject(new Error('GEOLOCATION_UNSUPPORTED'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 15,
          timestamp: pos.timestamp,
          isSimulated: false,
        });
      },
      (err) => {
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  });
}

/**
 * Starts continuous GPS watch
 */
export function startLocationWatch(onLocationUpdate, onError) {
  if (!isGeolocationAvailable()) {
    if (onError) onError(new Error('GEOLOCATION_UNSUPPORTED'));
    return null;
  }

  // Clear existing watch if any
  stopLocationWatch();

  try {
    activeWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const update = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 15,
          timestamp: pos.timestamp,
          isSimulated: false,
        };
        onLocationUpdate(update);
      },
      (err) => {
        if (onError) onError(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
    return activeWatchId;
  } catch (err) {
    if (onError) onError(err);
    return null;
  }
}

/**
 * Stops continuous GPS watch to prevent background drain
 */
export function stopLocationWatch() {
  if (activeWatchId !== null && isGeolocationAvailable()) {
    navigator.geolocation.clearWatch(activeWatchId);
    activeWatchId = null;
  }
}

/**
 * Haversine distance formula between two lat/lon points (in meters)
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates bearing from origin to target in degrees (0..360, 0 = North)
 */
export function calculateBearingDegrees(lat1, lon1, lat2, lon2) {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

/**
 * Generates destination lat/lon given origin coordinates and dx, dy in meters
 */
export function addMetersOffset(lat, lon, dxMeters, dyMeters) {
  const dLat = dyMeters / 111139;
  const dLon = dxMeters / (111139 * Math.cos((lat * Math.PI) / 180));
  return {
    lat: lat + dLat,
    lon: lon + dLon,
  };
}

/**
 * Evaluates active anomalies relative to user position
 * @param {Object} userPos - { lat, lon, accuracy, isSimulated }
 * @param {number} simulationOffsetMeters - Optional adjustment for testing without walking
 * @returns {Array} List of processed anomalies with distance, signal strength, and encounter availability
 */
export function getEvaluatedAnomalies(userPos, simulationOffsetMeters = 0) {
  const origin = userPos || DEFAULT_SIMULATED_ORIGIN;
  const cooldowns = getAnomalyCooldowns();
  const now = Date.now();

  return VIRTUAL_ANOMALY_TEMPLATES.map((tmpl) => {
    // Determine world coordinates of this virtual anomaly relative to player origin
    const coords = addMetersOffset(origin.lat, origin.lon, tmpl.offset.dx, tmpl.offset.dy);

    // Natural distance in physical meters
    const rawDistance = calculateDistanceMeters(origin.lat, origin.lon, coords.lat, coords.lon);

    // Apply manual proximity simulation offset if player is testing indoors or on desktop
    // Clamped so distance never goes below 2 meters
    const effectiveDistance = Math.max(2, rawDistance - simulationOffsetMeters);

    // Calculate bearing (angle on radar relative to North)
    const bearing = calculateBearingDegrees(origin.lat, origin.lon, coords.lat, coords.lon);

    // Calculate signal strength percentage (100% at <= 5m, 0% at >= detectionRadius)
    const normalizedDist = Math.min(tmpl.detectionRadius, effectiveDistance);
    const signalPct = Math.round(
      Math.max(0, (1 - normalizedDist / tmpl.detectionRadius) * 100)
    );

    // Calculate approximate RF dBm strength (-110 dBm to -48 dBm)
    const dbm = Math.round(-110 + (signalPct / 100) * 62);

    // Check cooldown status
    const lastEncounter = cooldowns[tmpl.id];
    const cooldownMs = tmpl.cooldownMinutes * 60 * 1000;
    const isCoolingDown = lastEncounter && now - lastEncounter < cooldownMs;
    const cooldownRemainingSec = isCoolingDown
      ? Math.ceil((cooldownMs - (now - lastEncounter)) / 1000)
      : 0;

    // Check if player is within encounter radius
    const inRange = effectiveDistance <= tmpl.encounterRadius;
    const canEngage = inRange && !isCoolingDown;

    return {
      ...tmpl,
      coords,
      distanceMeters: effectiveDistance,
      bearing,
      signalPct,
      dbm,
      inRange,
      canEngage,
      isCoolingDown,
      cooldownRemainingSec,
    };
  });
}

/**
 * Triggers safe, throttled haptic vibration when proximity pulse is active
 * @param {number} signalPct - Signal strength 0..100
 * @param {boolean} enabled - User preference toggle
 */
export function triggerSignalHaptic(signalPct, enabled = true) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;

  const now = Date.now();
  // Throttle interval inversely proportional to signal strength:
  // 100% signal -> pulse every 300ms
  // 20% signal -> pulse every 1400ms
  const interval = Math.max(300, 1600 - signalPct * 13);

  if (now - lastHapticTime >= interval) {
    lastHapticTime = now;
    try {
      // Gentle 18ms pulse
      navigator.vibrate(18);
    } catch {
      // Ignore vibration error
    }
  }
}
