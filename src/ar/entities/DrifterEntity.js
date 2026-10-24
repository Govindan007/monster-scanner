import * as THREE from 'three';
import { EntityStateMachine, EntityState } from './EntityStateMachine';

/**
 * THE DRIFTER — Second Complete VEIL Horror Entity (VOID-049 // CLASS IV)
 * A levitating, fragmented spectral entity defying terrestrial gravity.
 * Features a hovering core, orbiting detached tendrils, glowing focal beacon,
 * bounded viewer tracking, scan reaction, and clean dissolution.
 */
export class DrifterEntity {
  constructor({ onStateChange } = {}) {
    this.name = 'THE DRIFTER';
    this.code = 'VOID-049 // CLASS IV';
    this.threat = 'HIGH';
    this.resonance = '128.6 MHz';

    this.root = new THREE.Group();
    this.root.name = 'DrifterEntity';

    this.disposables = [];
    this.stateMachine = new EntityStateMachine(EntityState.IDLE, onStateChange);

    // Particles configuration
    this.particleCount = 45;
    this.particlePositions = null;
    this.particleVelocities = [];

    // Pre-allocated math objects to avoid per-frame GC allocations
    this._targetYaw = 0;
    this._currentYaw = 0;
    this._localCamPos = new THREE.Vector3();
    this.baseFloatingHeight = 1.15; // Hovering ~1.15m above floor plane

    this.dissolveProgress = 0;
    this.onDissolveComplete = null;

    this.initModel();
    this.initParticles();
  }

  initModel() {
    // 1. Materials
    this.shardMaterial = new THREE.MeshStandardMaterial({
      color: 0x140d22,
      emissive: 0x180830,
      roughness: 0.45,
      metalness: 0.65,
      transparent: true,
      opacity: 1.0,
    });
    this.disposables.push(this.shardMaterial);

    this.beaconMaterial = new THREE.MeshBasicMaterial({
      color: 0xb366ff, // Piercing spectral violet/magenta
      transparent: true,
      opacity: 0.95,
    });
    this.disposables.push(this.beaconMaterial);

    this.auraMaterial = new THREE.MeshBasicMaterial({
      color: 0x7722cc,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    this.disposables.push(this.auraMaterial);

    // 2. Floating Body Assembly
    this.floatingGroup = new THREE.Group();
    this.floatingGroup.position.set(0, this.baseFloatingHeight, 0);
    this.root.add(this.floatingGroup);

    // Central Core Polyhedron
    const coreGeo = new THREE.IcosahedronGeometry(0.18, 1);
    this.disposables.push(coreGeo);
    this.coreMesh = new THREE.Mesh(coreGeo, this.shardMaterial);
    this.floatingGroup.add(this.coreMesh);

    // Glowing Focal Eye / Core Beacon
    const beaconGeo = new THREE.SphereGeometry(0.065, 16, 16);
    this.disposables.push(beaconGeo);
    this.beaconMesh = new THREE.Mesh(beaconGeo, this.beaconMaterial);
    this.beaconMesh.position.set(0, 0, 0.12);
    this.floatingGroup.add(this.beaconMesh);

    // Dynamic Spectral Light Source
    this.coreLight = new THREE.PointLight(0xa855f7, 2.2, 5.0);
    this.coreLight.position.set(0, 0, 0.15);
    this.floatingGroup.add(this.coreLight);

    // Ethereal Broken Orbital Ring
    const ringGeo = new THREE.TorusGeometry(0.36, 0.012, 8, 36);
    ringGeo.rotateX(Math.PI / 4);
    this.disposables.push(ringGeo);
    this.ringMesh = new THREE.Mesh(ringGeo, this.auraMaterial);
    this.floatingGroup.add(this.ringMesh);

    // 3. Four Fragmented Orbiting Tendril Shards
    this.shards = [];
    const shardGeo = new THREE.ConeGeometry(0.045, 0.72, 5);
    this.disposables.push(shardGeo);

    const shardOffsets = [
      { x: -0.28, y: -0.35, z: 0.05, rotZ: 0.35, rotX: 0.1 },
      { x: 0.28, y: -0.35, z: -0.05, rotZ: -0.35, rotX: -0.1 },
      { x: -0.16, y: -0.55, z: -0.18, rotZ: 0.15, rotX: -0.25 },
      { x: 0.16, y: -0.55, z: 0.18, rotZ: -0.15, rotX: 0.25 },
    ];

    shardOffsets.forEach((config) => {
      const shardHolder = new THREE.Group();
      shardHolder.position.set(config.x, config.y, config.z);
      shardHolder.rotation.z = config.rotZ;
      shardHolder.rotation.x = config.rotX;

      const mesh = new THREE.Mesh(shardGeo, this.shardMaterial);
      mesh.rotation.x = Math.PI; // point downwards
      shardHolder.add(mesh);

      this.floatingGroup.add(shardHolder);
      this.shards.push({ holder: shardHolder, basePos: new THREE.Vector3(config.x, config.y, config.z) });
    });
  }

  initParticles() {
    const count = this.particleCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = Math.random() * 0.7 + 0.25;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3 + 0] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1.2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      this.particleVelocities.push({
        angle: angle,
        speed: Math.random() * 0.9 + 0.4,
        radius: radius,
        vy: (Math.random() - 0.5) * 0.15,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particlePositions = positions;
    this.disposables.push(geometry);

    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xc084fc,
      size: 0.03,
      transparent: true,
      opacity: 0.75,
    });
    this.disposables.push(this.particleMaterial);

    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.floatingGroup.add(this.particles);
  }

  /**
   * Updates encounter state from EncounterDirector
   */
  setEncounterState(encounterState) {
    this._encounterState = encounterState;

    if (encounterState === 'DISTURBED') {
      this.triggerDisturbed();
    } else if (encounterState === 'ESCAPING') {
      this.triggerDissolve();
    } else if (encounterState === 'SCANNING') {
      this.beaconMaterial.color.setHex(0x00f0ff);
      this.coreLight.color.setHex(0x00e5ff);
      this.coreLight.intensity = 4.5;
    } else if (encounterState === 'RESOLVED') {
      this.beaconMaterial.color.setHex(0x7dd3fc);
      this.coreLight.color.setHex(0x38bdf8);
      this.coreLight.intensity = 3.0;
    } else if (encounterState === 'OBSERVING') {
      this.beaconMaterial.color.setHex(0xb366ff);
      this.coreLight.color.setHex(0xa855f7);
      this.coreLight.intensity = 2.2;
      this.particleMaterial.color.setHex(0xc084fc);
    }
  }

  triggerDisturbed() {
    if (this.stateMachine.canTransitionTo(EntityState.DISTURBED)) {
      this.stateMachine.transitionTo(EntityState.DISTURBED);

      // Core beacon flares into blinding cyan
      this.beaconMaterial.color.setHex(0x00f0ff);
      this.coreLight.color.setHex(0x00e5ff);
      this.coreLight.intensity = 4.2;
      this.particleMaterial.color.setHex(0x38bdf8);
    }
  }

  triggerDissolve(onComplete = null) {
    if (this.stateMachine.canTransitionTo(EntityState.DISAPPEARING)) {
      this.stateMachine.transitionTo(EntityState.DISAPPEARING);
      this.dissolveProgress = 0;
      this.onDissolveComplete = onComplete;
    } else if (onComplete) {
      onComplete();
    }
  }

  update(elapsedTime, delta, cameraWorldPos, encounterState = null) {
    const activeState = encounterState || this._encounterState || this.stateMachine.getCurrentState();
    const state = this.stateMachine.getCurrentState();
    if (state === EntityState.INACTIVE) return;

    this.stateMachine.update(delta);
    const stateTime = this.stateMachine.getStateTime();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Phase 4 Appearance Phase
    if (activeState === 'APPEARING') {
      const emergeProgress = Math.min(1.0, stateTime / 1.1);
      this.floatingGroup.scale.set(emergeProgress, emergeProgress, emergeProgress);
      this.shardMaterial.opacity = emergeProgress;
      this.beaconMaterial.opacity = emergeProgress;
      this.coreLight.intensity = emergeProgress * 2.2;
      return;
    } else {
      this.floatingGroup.scale.set(1.0, 1.0, 1.0);
    }

    // 1. Smooth Levitation Physics (Base sine oscillation bounded strictly in local group space)
    const hoverOffset = prefersReducedMotion ? 0 : Math.sin(elapsedTime * 1.7) * 0.08;
    this.floatingGroup.position.y = this.baseFloatingHeight + hoverOffset;

    // Core slow ambient tumble
    if (!prefersReducedMotion) {
      this.coreMesh.rotation.y = elapsedTime * 0.4;
      this.coreMesh.rotation.x = Math.sin(elapsedTime * 0.8) * 0.15;
      this.ringMesh.rotation.z = -elapsedTime * 0.3;
    }

    // 2. STATE LOGIC
    switch (state) {
      case EntityState.IDLE:
      case EntityState.OBSERVING:
        // Bounded core tracking toward player's camera position
        if (cameraWorldPos && !prefersReducedMotion) {
          this._localCamPos.copy(cameraWorldPos);
          this.root.worldToLocal(this._localCamPos);

          const angle = Math.atan2(this._localCamPos.x, this._localCamPos.z);
          const clampedAngle = THREE.MathUtils.clamp(angle, -Math.PI / 3, Math.PI / 3);

          this._targetYaw = clampedAngle;
          this._currentYaw = THREE.MathUtils.lerp(this._currentYaw, this._targetYaw, 0.06);
          this.floatingGroup.rotation.y = this._currentYaw;
        }

        // Shards gentle orbit or scanning vortex
        if (!prefersReducedMotion) {
          if (activeState === 'SCANNING') {
            // Rapid vortex orbit during scan
            const spinRate = elapsedTime * 3.2;
            for (let i = 0; i < this.shards.length; i++) {
              const shard = this.shards[i];
              const shardAngle = spinRate + (i * Math.PI) / 2;
              const radius = 0.34 + Math.sin(elapsedTime * 10.0) * 0.04;
              shard.holder.position.x = Math.cos(shardAngle) * radius;
              shard.holder.position.z = Math.sin(shardAngle) * radius;
              shard.holder.position.y = shard.basePos.y + Math.sin(elapsedTime * 8.0 + i) * 0.06;
            }
            this.coreLight.intensity = 3.8 + Math.sin(elapsedTime * 25.0) * 1.4;
          } else {
            // Gentle undulation in observing
            for (let i = 0; i < this.shards.length; i++) {
              const shard = this.shards[i];
              const wave = Math.sin(elapsedTime * 2.0 + i) * 0.04;
              shard.holder.position.x = shard.basePos.x;
              shard.holder.position.z = shard.basePos.z;
              shard.holder.position.y = shard.basePos.y + wave;
              // Phase 7: Independent axial shard tumble
              shard.holder.rotation.y = elapsedTime * (0.8 + i * 0.25);
              shard.holder.rotation.x = Math.sin(elapsedTime * 1.5 + i) * 0.18;
            }
            this.coreLight.intensity = 2.2 + Math.sin(elapsedTime * 3.2) * 0.5;
          }
        }
        break;

      case EntityState.DISTURBED:
        // Violent distortion reaction: shards flare outward, core jitters rapidly
        if (!prefersReducedMotion) {
          const jitter = Math.sin(stateTime * 45.0) * 0.07 * Math.exp(-stateTime * 0.8);
          this.floatingGroup.position.x = jitter;
          this.floatingGroup.rotation.z = jitter * 1.5;

          // Splay shards outwards
          for (let i = 0; i < this.shards.length; i++) {
            const shard = this.shards[i];
            const flare = Math.sin(stateTime * 20.0) * 0.12;
            shard.holder.position.x = shard.basePos.x * (1.3 + flare);
          }
        }

        if (stateTime > 2.8 && activeState !== 'DISTURBED' && activeState !== 'SCANNING') {
          this.beaconMaterial.color.setHex(0xb366ff);
          this.coreLight.color.setHex(0xa855f7);
          this.coreLight.intensity = 2.2;
          this.particleMaterial.color.setHex(0xc084fc);
          this.floatingGroup.position.x = 0;
          this.stateMachine.transitionTo(EntityState.OBSERVING);
        }
        break;

      case EntityState.DISAPPEARING:
        this.dissolveProgress += delta / 1.5;
        const remainingAlpha = Math.max(0, 1.0 - this.dissolveProgress);

        this.shardMaterial.opacity = remainingAlpha;
        this.beaconMaterial.opacity = remainingAlpha;
        this.auraMaterial.opacity = remainingAlpha * 0.35;
        this.particleMaterial.opacity = remainingAlpha * 0.75;
        this.coreLight.intensity = remainingAlpha * 2.5;

        // Implosion of core + dispersal of shards
        const implosion = Math.max(0.01, 1.0 - this.dissolveProgress * 1.2);
        this.coreMesh.scale.set(implosion, implosion, implosion);

        for (let i = 0; i < this.shards.length; i++) {
          const shard = this.shards[i];
          shard.holder.position.x += shard.basePos.x * delta * 1.2;
          shard.holder.position.y -= delta * 0.5;
        }

        if (this.dissolveProgress >= 1.0) {
          this.stateMachine.transitionTo(EntityState.INACTIVE);
          this.root.visible = false;
          if (this.onDissolveComplete) {
            this.onDissolveComplete();
            this.onDissolveComplete = null;
          }
        }
        break;
    }

    // 3. Orbiting Particles Update
    if (this.particles && this.particlePositions && !prefersReducedMotion) {
      const pos = this.particlePositions;
      const speedMultiplier = state === EntityState.DISTURBED ? 3.2 : 1.0;

      for (let i = 0; i < this.particleCount; i++) {
        const vel = this.particleVelocities[i];
        vel.angle += vel.speed * speedMultiplier * delta;

        pos[i * 3 + 0] = Math.cos(vel.angle) * vel.radius;
        pos[i * 3 + 2] = Math.sin(vel.angle) * vel.radius;

        pos[i * 3 + 1] += vel.vy * delta;
        if (pos[i * 3 + 1] > 0.6) pos[i * 3 + 1] = -0.6;
        if (pos[i * 3 + 1] < -0.6) pos[i * 3 + 1] = 0.6;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  dispose() {
    this.stateMachine.transitionTo(EntityState.INACTIVE);
    this.disposables.forEach((item) => {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    });
    this.disposables = [];
    if (this.root.parent) {
      this.root.parent.remove(this.root);
    }
  }
}
