/**
 * VEIL // Phase 5: Paranormal Evidence & Investigation Definitions
 * Data-driven template registry for fictional paranormal evidence,
 * progressive dossier unlock tiers, and unresolved field hypotheses.
 *
 * NOTE: All evidence categories, resonance metrics, and spectral findings
 * are purely fictional game-world paranormal investigation lore.
 */

export const EvidenceCategory = Object.freeze({
  SPECTRAL_RESIDUE: 'spectral_residue',
  ANOMALOUS_MOVEMENT: 'anomalous_movement',
  VISUAL_DISTORTION: 'visual_distortion',
  UNUSUAL_ENERGY_SIGNATURE: 'unusual_energy_signature',
  BEHAVIOURAL_OBSERVATION: 'behavioural_observation',
});

export const EvidenceCategoryLabels = Object.freeze({
  [EvidenceCategory.SPECTRAL_RESIDUE]: 'SPECTRAL RESIDUE',
  [EvidenceCategory.ANOMALOUS_MOVEMENT]: 'ANOMALOUS MOVEMENT',
  [EvidenceCategory.VISUAL_DISTORTION]: 'VISUAL DISTORTION',
  [EvidenceCategory.UNUSUAL_ENERGY_SIGNATURE]: 'UNUSUAL ENERGY SIGNATURE',
  [EvidenceCategory.BEHAVIOURAL_OBSERVATION]: 'BEHAVIOURAL OBSERVATION',
});

/**
 * Pre-defined catalog of possible evidence items that can be awarded
 * per creature based on encounter outcomes.
 */
export const EVIDENCE_TEMPLATES = [
  // --- THE WATCHER (VOID-012) ---
  {
    templateId: 'ev_watcher_spect_01',
    entityId: 'the-watcher',
    category: EvidenceCategory.SPECTRAL_RESIDUE,
    title: 'Residual Tachyon Shadow Particulates',
    description: 'Microscopic non-baryonic shadow dust deposited along the floor rift plane following manifestation.',
    quality: 'CONFIRMED',
    confidence: '96.4%',
    trigger: 'RESOLVED',
  },
  {
    templateId: 'ev_watcher_energy_01',
    category: EvidenceCategory.UNUSUAL_ENERGY_SIGNATURE,
    entityId: 'the-watcher',
    title: '104.2 MHz Harmonic Carrier Spike',
    description: 'Sustained electromagnetic Carrier Spike detected during active scanning pulse lock.',
    quality: 'PRIME',
    confidence: '98.8%',
    trigger: 'RESOLVED',
  },
  {
    templateId: 'ev_watcher_behav_01',
    entityId: 'the-watcher',
    category: EvidenceCategory.BEHAVIOURAL_OBSERVATION,
    title: 'Spasmodic Ocular Tremor on Proximity',
    description: 'Subject displays involuntary high-frequency head convulsions and eye color shifts when observer breaches 1.1m.',
    quality: 'CONFIRMED',
    confidence: '92.1%',
    trigger: 'DISTURBED',
  },
  {
    templateId: 'ev_watcher_visual_01',
    entityId: 'the-watcher',
    category: EvidenceCategory.VISUAL_DISTORTION,
    title: 'Vertical Dimension Elongation Artifacts',
    description: 'Optical light bending recorded around torso contours during dispersal into the rift.',
    quality: 'ANOMALOUS',
    confidence: '88.5%',
    trigger: 'ESCAPED',
  },

  // --- THE DRIFTER (VOID-049) ---
  {
    templateId: 'ev_drifter_move_01',
    entityId: 'the-drifter',
    category: EvidenceCategory.ANOMALOUS_MOVEMENT,
    title: 'Harmonic Gravitational Negation',
    description: 'Floating group demonstrates smooth vertical levitation in complete defiance of local Earth gravity.',
    quality: 'PRIME',
    confidence: '99.1%',
    trigger: 'RESOLVED',
  },
  {
    templateId: 'ev_drifter_energy_01',
    entityId: 'the-drifter',
    category: EvidenceCategory.UNUSUAL_ENERGY_SIGNATURE,
    title: '128.6 MHz Spectral Beacon Resonance',
    description: 'Central luminescent polyhedron radiates intense oscillating ultraviolet/cyan light flux.',
    quality: 'CONFIRMED',
    confidence: '95.2%',
    trigger: 'RESOLVED',
  },
  {
    templateId: 'ev_drifter_behav_01',
    entityId: 'the-drifter',
    category: EvidenceCategory.BEHAVIOURAL_OBSERVATION,
    title: 'Resonant Vortex Tendril Rotation',
    description: 'Detached obsidian tendril shards accelerate into a vortex formation upon sensor pulse excitation.',
    quality: 'CONFIRMED',
    confidence: '91.8%',
    trigger: 'DISTURBED',
  },
  {
    templateId: 'ev_drifter_spect_01',
    entityId: 'the-drifter',
    category: EvidenceCategory.SPECTRAL_RESIDUE,
    title: 'Fragmented Obsidian Shard Traces',
    description: 'Ionized ether residue left in local room atmosphere after core implosive collapse.',
    quality: 'ANOMALOUS',
    confidence: '87.4%',
    trigger: 'ESCAPED',
  },

  // --- THE CRAWLER (VOID-077) ---
  {
    templateId: 'ev_crawler_behav_01',
    entityId: 'the-crawler',
    category: EvidenceCategory.BEHAVIOURAL_OBSERVATION,
    title: 'Bipedal Rearing Threat Posture',
    description: 'Carapace pivots +32 degrees upward and elevates forelimbs like mantis claws when agitated.',
    quality: 'PRIME',
    confidence: '97.6%',
    trigger: 'DISTURBED',
  },
  {
    templateId: 'ev_crawler_energy_01',
    entityId: 'the-crawler',
    category: EvidenceCategory.UNUSUAL_ENERGY_SIGNATURE,
    title: '92.4 MHz Sub-Surface Lowband Hum',
    description: 'Deep acoustic vibration transmitted through physical floor surfaces during scuttling locomotion.',
    quality: 'CONFIRMED',
    confidence: '94.0%',
    trigger: 'RESOLVED',
  },
  {
    templateId: 'ev_crawler_move_01',
    entityId: 'the-crawler',
    category: EvidenceCategory.ANOMALOUS_MOVEMENT,
    title: 'Planar Boundary Submersion',
    description: 'Entity dissolves into physical ground plane without structural floor damage.',
    quality: 'CONFIRMED',
    confidence: '93.3%',
    trigger: 'ESCAPED',
  },
  {
    templateId: 'ev_crawler_visual_01',
    entityId: 'the-crawler',
    category: EvidenceCategory.VISUAL_DISTORTION,
    title: 'Multi-Ocular Strobe Polarization',
    description: 'Quad-cluster ocular facets shift from amber to crimson under metaphysical scanning illumination.',
    quality: 'ANOMALOUS',
    confidence: '89.7%',
    trigger: 'RESOLVED',
  },
];

/**
 * Data-driven Dossier Progressive Milestones.
 * Unlocks deeper lore, field findings, and unresolved hypotheses as evidence accumulates.
 */
export const DOSSIER_TIERS = [
  {
    tier: 1,
    requiredEvidenceCount: 1,
    title: 'Preliminary Classification',
    description: 'Confirmed dimensional rift existence and basic metaphysical designation.',
  },
  {
    tier: 2,
    requiredEvidenceCount: 2,
    title: 'Behavioral & Resonance Profile',
    description: 'Mapped agitation thresholds, frequency harmonics, and physiological traits.',
  },
  {
    tier: 3,
    requiredEvidenceCount: 3,
    title: 'Field Hypotheses & Unresolved Mysteries',
    description: 'Advanced theoretical framework and deep metaphysical anomalies.',
  },
];

/**
 * Static entity dossier lore definitions revealed progressively
 */
export const ENTITY_DOSSIERS_LORE = {
  'the-watcher': {
    origin: 'Detected along ancient structural faultlines and planar intersecting room corners.',
    tier1Lore: 'The Watcher is categorized as a Class V Metaphysical Observer. It does not actively hunt terrestrial biological organisms, but anchors itself to reality rifts and fixates its gaze upon human observers.',
    tier2Lore: 'Agitation occurs when observers breach a 1.1m perimeter or deploy active electromagnetic sensor sweeps. During agitation, its upper cranial structure experiences violent micro-convulsions, accompanied by chromatic shifts in eye luminescence from cyan to blood crimson.',
    tier3Hypotheses: [
      'Hypothesis A: The entity is not an independent organism, but a three-dimensional projection of a higher-dimensional observer.',
      'Hypothesis B: Direct human eye contact stabilizes the rift; breaking observation causes it to seek another anchored coordinate.',
    ],
    unresolvedQuestions: [
      'What purpose does its persistent observation serve?',
      'Why does its body refuse to move beyond its anchored surface coordinate?',
    ],
  },
  'the-drifter': {
    origin: 'Manifests in rooms with elevated radio-frequency interference and ungrounded electrical conduits.',
    tier1Lore: 'The Drifter is a Class IV Levitating Spectral entity. It exhibits complete immunity to local terrestrial gravity, hovering effortlessly ~1.15m above the surface with four detached satellite shards.',
    tier2Lore: 'Resonates at 128.6 MHz. Scanning frequencies cause its orbiting shards to accelerate into a resonant vortex, drawing surrounding ambient light into its central glowing polyhedron core.',
    tier3Hypotheses: [
      'Hypothesis A: The central polyhedron functions as a localized space-time warp engine, maintaining levitation through vacuum polarization.',
      'Hypothesis B: Its detached shards are sensory telemetry probes measuring atmospheric entropy.',
    ],
    unresolvedQuestions: [
      'Where do the shards disperse when the central core collapses?',
      'Does the core contain physical matter or pure coherent electromagnetic energy?',
    ],
  },
  'the-crawler': {
    origin: 'Emanates from low horizontal boundaries, under furniture, and damp concrete substructures.',
    tier1Lore: 'The Crawler is a Class VI Sub-surface Strider. Equipped with six multi-jointed chitinous appendages, it stalks along physical floor planes with uncanny silent precision.',
    tier2Lore: 'Emits a 92.4 MHz lowband vibration through solid floor planes. When scanned or threatened, it pivots into an aggressive rearing posture with raised strike claws and glowing ocular facets.',
    tier3Hypotheses: [
      'Hypothesis A: The Crawler possesses a metaphysical burrowing organ capable of passing through solid materials by phase-shifting.',
      'Hypothesis B: Its multi-cluster eyes detect thermal heat signatures combined with psychic resonance waves.',
    ],
    unresolvedQuestions: [
      'How does it pass through solid concrete floor planes without leaving physical breaches?',
      'What triggers its defensive rearing posture when scanned?',
    ],
  },
};
