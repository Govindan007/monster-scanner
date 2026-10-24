import { WatcherEntity } from './WatcherEntity';
import { DrifterEntity } from './DrifterEntity';
import { CrawlerEntity } from './CrawlerEntity';

/**
 * VEIL Central Entity Registry
 * Defines metadata, classification, scan properties, and model factories
 * for all manifested horror entities.
 */
export const ENTITY_REGISTRY = [
  {
    id: 'the-watcher',
    name: 'THE WATCHER',
    code: 'VOID-012 // CLASS V',
    designation: 'VOID-012',
    classification: 'METAPHYSICAL OBSERVER',
    threat: 'EXTREME',
    resonance: '104.2 MHz',
    weight: 40,
    scanDuration: 1800, // 1.8 seconds scan
    description:
      'An unnaturally tall, thin humanoid silhouette rooted to planar rift coordinates. Fixates its pale glowing gaze on biological observers.',
    behaviorSummary: 'Fixating on observation position. Disturbed by active frequency scans.',
    visualConfig: {
      silhouette: 'Tall Elongated Humanoid (~1.95m)',
      colorAccent: '#00f0ff',
      glowColor: '#38bdf8',
      materialType: 'Procedural Shaded Obsidian',
    },
    createInstance: (options) => new WatcherEntity(options),
  },
  {
    id: 'the-drifter',
    name: 'THE DRIFTER',
    code: 'VOID-049 // CLASS IV',
    designation: 'VOID-049',
    classification: 'LEVITATING SPECTRAL',
    threat: 'HIGH',
    resonance: '128.6 MHz',
    weight: 30,
    scanDuration: 2200, // 2.2 seconds scan
    description:
      'A fragmented entity hovering above the ground. Radiates electromagnetic distortion around a central pulsating beacon with orbiting shards.',
    behaviorSummary: 'Defies gravity in smooth harmonic levitation. Flares violently under direct pulse resonance.',
    visualConfig: {
      silhouette: 'Floating Core with Detached Tendrils (~1.15m height)',
      colorAccent: '#b366ff',
      glowColor: '#a855f7',
      materialType: 'Procedural Fragmented Polyhedron',
    },
    createInstance: (options) => new DrifterEntity(options),
  },
  {
    id: 'the-crawler',
    name: 'THE CRAWLER',
    code: 'VOID-077 // CLASS VI',
    designation: 'VOID-077',
    classification: 'SUB-SURFACE STRIDER',
    threat: 'CRITICAL',
    resonance: '92.4 MHz',
    weight: 30,
    scanDuration: 2000, // 2.0 seconds scan
    description:
      'A low, multi-limbed chitinous horror that scuttles along physical floor planes. Aggressively sensitive to scanning pulses.',
    behaviorSummary: 'Stalks low along detected ground planes. Rears up defensively when scanned.',
    visualConfig: {
      silhouette: 'Low Six-Limbed Insectoid (span ~0.95m, height ~0.42m)',
      colorAccent: '#f59e0b',
      glowColor: '#ef4444',
      materialType: 'Procedural Articulated Chitin',
    },
    createInstance: (options) => new CrawlerEntity(options),
  },
];

/**
 * Retrieves entity definition by ID
 */
export function getEntityById(id) {
  return ENTITY_REGISTRY.find((e) => e.id === id) || ENTITY_REGISTRY[0];
}

/**
 * Returns all registered entity definitions
 */
export function getAllEntities() {
  return [...ENTITY_REGISTRY];
}

/**
 * Returns default starting entity (The Watcher)
 */
export function getDefaultEntity() {
  return ENTITY_REGISTRY[0];
}
