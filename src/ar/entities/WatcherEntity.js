import * as THREE from 'three';
import { EntityStateMachine, EntityState } from './EntityStateMachine';

/**
 * THE WATCHER — First Complete VEIL Horror Entity
 * Production-quality procedural 3D entity with state machine,
 * bounded viewer tracking, disturbed scan reactions, and dissolving transitions.
 * Realistic scale: ~1.95m tall.
 */
export class WatcherEntity {
  constructor({ onStateChange } = {}) {
    this.name = 'THE WATCHER';
    this.code = 'VOID-012 // CLASS V';
    this.threat = 'EXTREME';
    this.resonance = '104.2 MHz';

    this.root = new THREE.Group();
    this.root.name = 'WatcherEntity';

    this.disposables = [];
    this.stateMachine = new EntityStateMachine(EntityState.IDLE, onStateChange);

    // Particle system properties
    this.particleCount = 65;
    this.particlePositions = null;
    this.particleVelocities = [];

    // Pre-allocated math objects to avoid per-frame GC allocations
    this._targetHeadYaw = 0;
    this._currentHeadYaw = 0;
    this._dirToCamera = new THREE.Vector3();
    this._localCamPos = new THREE.Vector3();

    this.dissolveProgress = 0;
    this.onDissolveComplete = null;

    this.initModel();
    this.initParticles();
  }

  initModel() {
    // 1. Shaded Materials: Obsidian charcoal with subtle horror emissive sheen for camera visibility
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x141824,
      emissive: 0x080c16,
      roughness: 0.55,
      metalness: 0.45,
      transparent: true,
      opacity: 1.0,
    });
    this.disposables.push(this.bodyMaterial);

    this.eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xe0f8ff, // Uncanny pale ice-white/cyan
      transparent: true,
      opacity: 1.0,
    });
    this.disposables.push(this.eyeMaterial);

    this.ribAuraMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    this.disposables.push(this.ribAuraMaterial);

    // 2. ROOT & LEGS (Anchored to floor at y = 0, legs height = 0.96m)
    const legGeo = new THREE.CylinderGeometry(0.035, 0.022, 0.96, 8);
    this.disposables.push(legGeo);

    // Left leg
    const leftLeg = new THREE.Mesh(legGeo, this.bodyMaterial);
    leftLeg.position.set(-0.11, 0.48, 0);
    this.root.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeo, this.bodyMaterial);
    rightLeg.position.set(0.11, 0.48, 0);
    this.root.add(rightLeg);

    // Feet
    const footGeo = new THREE.BoxGeometry(0.05, 0.03, 0.14);
    this.disposables.push(footGeo);
    const leftFoot = new THREE.Mesh(footGeo, this.bodyMaterial);
    leftFoot.position.set(-0.11, 0.015, 0.03);
    this.root.add(leftFoot);
    const rightFoot = new THREE.Mesh(footGeo, this.bodyMaterial);
    rightFoot.position.set(0.11, 0.015, 0.03);
    this.root.add(rightFoot);

    // 3. UPPER BODY GROUP (Permits rotation toward observer without moving base)
    this.upperBodyGroup = new THREE.Group();
    this.upperBodyGroup.position.set(0, 0.96, 0);
    this.root.add(this.upperBodyGroup);

    // Pelvis/Hips
    const pelvisGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.2, 8);
    this.disposables.push(pelvisGeo);
    const pelvis = new THREE.Mesh(pelvisGeo, this.bodyMaterial);
    pelvis.position.set(0, 0.1, 0);
    this.upperBodyGroup.add(pelvis);

    // Tapered, emaciated torso (broad shoulders, thin spine)
    const torsoGeo = new THREE.ConeGeometry(0.2, 0.54, 8);
    this.disposables.push(torsoGeo);
    this.torsoMesh = new THREE.Mesh(torsoGeo, this.bodyMaterial);
    this.torsoMesh.rotation.x = Math.PI; // Inverted cone
    this.torsoMesh.position.set(0, 0.45, 0);
    this.upperBodyGroup.add(this.torsoMesh);

    // Sculpted rib cage / ethereal aura
    const ribGeo = new THREE.CylinderGeometry(0.21, 0.15, 0.42, 6);
    this.disposables.push(ribGeo);
    this.ribAura = new THREE.Mesh(ribGeo, this.ribAuraMaterial);
    this.ribAura.position.set(0, 0.45, 0);
    this.upperBodyGroup.add(this.ribAura);

    // 4. HEAD GROUP (Elongated neck, head, eyes, and eye light)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.72, 0); // Origin at neck base
    this.upperBodyGroup.add(this.headGroup);

    // Elongated neck
    const neckGeo = new THREE.CylinderGeometry(0.042, 0.052, 0.2, 8);
    this.disposables.push(neckGeo);
    const neck = new THREE.Mesh(neckGeo, this.bodyMaterial);
    neck.position.set(0, 0.1, 0);
    this.headGroup.add(neck);

    // Disturbing elongated head
    const headGeo = new THREE.SphereGeometry(0.115, 16, 16);
    headGeo.scale(0.85, 1.48, 0.95);
    this.disposables.push(headGeo);
    this.headMesh = new THREE.Mesh(headGeo, this.bodyMaterial);
    this.headMesh.position.set(0, 0.28, 0);
    this.headGroup.add(this.headMesh);

    // Sunken eye sockets & pale glowing eye pinpoints
    const eyeGeo = new THREE.SphereGeometry(0.016, 8, 8);
    this.disposables.push(eyeGeo);

    this.leftEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    this.leftEye.position.set(-0.04, 0.3, 0.098);
    this.headGroup.add(this.leftEye);

    this.rightEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    this.rightEye.position.set(0.038, 0.31, 0.098);
    this.headGroup.add(this.rightEye);

    // Eye glow lighting
    this.eyeLight = new THREE.PointLight(0x38bdf8, 1.6, 2.2);
    this.eyeLight.position.set(0, 0.3, 0.15);
    this.headGroup.add(this.eyeLight);

    // 5. ELONGATED ARMS (Drooping past knees, ~1.15m long)
    const armGeo = new THREE.CylinderGeometry(0.025, 0.016, 1.1, 6);
    this.disposables.push(armGeo);

    // Left Arm Group
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.22, 0.65, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, this.bodyMaterial);
    leftArmMesh.position.set(0, -0.55, 0);
    leftArmMesh.rotation.z = 0.07;
    this.leftArm.add(leftArmMesh);

    // Fingers
    const fingerGeo = new THREE.CylinderGeometry(0.005, 0.002, 0.22, 4);
    this.disposables.push(fingerGeo);
    for (let i = -1; i <= 1; i++) {
      const finger = new THREE.Mesh(fingerGeo, this.bodyMaterial);
      finger.position.set(i * 0.015, -1.18, 0);
      finger.rotation.z = i * 0.14;
      this.leftArm.add(finger);
    }
    this.upperBodyGroup.add(this.leftArm);

    // Right Arm Group
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.22, 0.65, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, this.bodyMaterial);
    rightArmMesh.position.set(0, -0.55, 0);
    rightArmMesh.rotation.z = -0.07;
    this.rightArm.add(rightArmMesh);

    for (let i = -1; i <= 1; i++) {
      const finger = new THREE.Mesh(fingerGeo, this.bodyMaterial);
      finger.position.set(i * 0.015, -1.18, 0);
      finger.rotation.z = -i * 0.14;
      this.rightArm.add(finger);
    }
    this.upperBodyGroup.add(this.rightArm);
  }

  initParticles() {
    const count = this.particleCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 1.0;
      positions[i * 3 + 1] = Math.random() * 2.1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.0;

      this.particleVelocities.push({
        vy: Math.random() * 0.18 + 0.06,
        freq: Math.random() * 2.0 + 1.0,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particlePositions = positions;
    this.disposables.push(geometry);

    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xaa1111,
      size: 0.026,
      transparent: true,
      opacity: 0.7,
    });
    this.disposables.push(this.particleMaterial);

    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.root.add(this.particles);
  }

  /**
   * Triggers DISTURBED state when scanned
   */
  triggerDisturbed() {
    if (this.stateMachine.canTransitionTo(EntityState.DISTURBED)) {
      this.stateMachine.transitionTo(EntityState.DISTURBED);

      // Eye flashes piercing crimson
      this.eyeMaterial.color.setHex(0xff1111);
      this.eyeLight.color.setHex(0xff0000);
      this.eyeLight.intensity = 3.5;
      this.particleMaterial.color.setHex(0xff3333);
    }
  }

  /**
   * Triggers DISAPPEARING fade out
   */
  triggerDissolve(onComplete = null) {
    if (this.stateMachine.canTransitionTo(EntityState.DISAPPEARING)) {
      this.stateMachine.transitionTo(EntityState.DISAPPEARING);
      this.dissolveProgress = 0;
      this.onDissolveComplete = onComplete;
    }
  }

  /**
   * Main per-frame animation update called by AR render loop
   */
  update(elapsedTime, delta, cameraWorldPos) {
    const state = this.stateMachine.getCurrentState();
    if (state === EntityState.INACTIVE) return;

    this.stateMachine.update(delta);
    const stateTime = this.stateMachine.getStateTime();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. STATE-SPECIFIC LOGIC
    switch (state) {
      case EntityState.IDLE:
        // Subtle resting breathing
        if (!prefersReducedMotion) {
          const breathe = 1.0 + Math.sin(elapsedTime * 2.2) * 0.025;
          this.torsoMesh.scale.set(breathe, 1.0, breathe);
          this.leftArm.rotation.x = Math.sin(elapsedTime * 1.5) * 0.04;
          this.rightArm.rotation.x = -Math.sin(elapsedTime * 1.5) * 0.04;
          this.eyeLight.intensity = 1.6 + Math.sin(elapsedTime * 3.0) * 0.5;
        }
        // Auto transition to observing after 2 seconds
        if (stateTime > 2.0) {
          this.stateMachine.transitionTo(EntityState.OBSERVING);
        }
        break;

      case EntityState.OBSERVING:
        // Breathing
        if (!prefersReducedMotion) {
          const breathe = 1.0 + Math.sin(elapsedTime * 2.2) * 0.025;
          this.torsoMesh.scale.set(breathe, 1.0, breathe);
          this.leftArm.rotation.x = Math.sin(elapsedTime * 1.5) * 0.04;
          this.rightArm.rotation.x = -Math.sin(elapsedTime * 1.5) * 0.04;
          this.eyeLight.intensity = 1.8 + Math.sin(elapsedTime * 3.0) * 0.4;
        }

        // Bounded Head & Upper Body Tracking toward viewer position
        if (cameraWorldPos && !prefersReducedMotion) {
          // Convert camera world position to local space of entity root
          this._localCamPos.copy(cameraWorldPos);
          this.root.worldToLocal(this._localCamPos);

          // Calculate yaw angle to camera (XZ plane)
          const angle = Math.atan2(this._localCamPos.x, this._localCamPos.z);
          // Clamp rotation to maximum +/- 45 degrees so body remains anchored
          const clampedAngle = THREE.MathUtils.clamp(angle, -Math.PI / 4, Math.PI / 4);

          // Smoothly interpolate head rotation
          this._targetHeadYaw = clampedAngle;
          this._currentHeadYaw = THREE.MathUtils.lerp(this._currentHeadYaw, this._targetHeadYaw, 0.05);

          this.headGroup.rotation.y = this._currentHeadYaw;
          this.upperBodyGroup.rotation.y = this._currentHeadYaw * 0.35;
        }
        break;

      case EntityState.DISTURBED:
        // Shudder / Twitch Reaction
        if (!prefersReducedMotion) {
          const twitch = Math.sin(stateTime * 35.0) * 0.06 * Math.exp(-stateTime * 1.2);
          this.headGroup.rotation.z = twitch;
          this.headGroup.rotation.x = -0.15 + Math.sin(stateTime * 20.0) * 0.04;
          this.leftArm.rotation.z = 0.2 + Math.sin(stateTime * 18.0) * 0.08;
          this.rightArm.rotation.z = -0.2 - Math.sin(stateTime * 18.0) * 0.08;
          this.eyeLight.intensity = 3.2 + Math.sin(stateTime * 40.0) * 1.2;
        }

        // After 2.6 seconds, calm down back to OBSERVING
        if (stateTime > 2.6) {
          this.eyeMaterial.color.setHex(0xe0f2fe);
          this.eyeLight.color.setHex(0x38bdf8);
          this.eyeLight.intensity = 1.8;
          this.particleMaterial.color.setHex(0xaa1111);
          this.stateMachine.transitionTo(EntityState.OBSERVING);
        }
        break;

      case EntityState.DISAPPEARING:
        // Linear fade out over 1.8s
        this.dissolveProgress += delta / 1.8;
        const remainingAlpha = Math.max(0, 1.0 - this.dissolveProgress);

        this.bodyMaterial.opacity = remainingAlpha;
        this.eyeMaterial.opacity = remainingAlpha;
        this.ribAuraMaterial.opacity = remainingAlpha * 0.25;
        this.particleMaterial.opacity = remainingAlpha * 0.7;
        this.eyeLight.intensity = remainingAlpha * 1.8;

        // Disperse particles outward
        if (this.particlePositions) {
          for (let i = 0; i < this.particleCount; i++) {
            this.particlePositions[i * 3 + 0] *= 1.02;
            this.particlePositions[i * 3 + 1] += delta * 0.4;
            this.particlePositions[i * 3 + 2] *= 1.02;
          }
          this.particles.geometry.attributes.position.needsUpdate = true;
        }

        if (this.dissolveProgress >= 1.0) {
          this.stateMachine.transitionTo(EntityState.INACTIVE);
          if (this.onDissolveComplete) {
            this.onDissolveComplete();
            this.onDissolveComplete = null;
          }
        }
        break;
    }

    // 2. PARTICLES & WIREFRAME (Active during IDLE, OBSERVING, DISTURBED)
    if (state !== EntityState.DISAPPEARING && !prefersReducedMotion) {
      if (this.ribAura) {
        this.ribAura.rotation.y += 0.009;
      }

      if (this.particles && this.particlePositions) {
        const count = this.particleCount;
        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          const vel = this.particleVelocities[i];

          this.particlePositions[idx + 1] += vel.vy * delta;
          this.particlePositions[idx + 0] += Math.sin(elapsedTime * vel.freq + i) * 0.0012;

          // Recycle particle when it drifts above head
          if (this.particlePositions[idx + 1] > 2.25) {
            this.particlePositions[idx + 1] = 0.08;
            this.particlePositions[idx + 0] = (Math.random() - 0.5) * 0.85;
            this.particlePositions[idx + 2] = (Math.random() - 0.5) * 0.85;
          }
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
      }
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
