import * as THREE from 'three';
import { EntityStateMachine, EntityState } from './EntityStateMachine';

/**
 * THE CRAWLER — Third Complete VEIL Horror Entity (VOID-077 // CLASS VI)
 * A low, multi-limbed chitinous horror that scuttles along physical floor planes.
 * Features an armored carapace, 6 articulated limbs, cluster of glowing eyes,
 * rearing scan reaction, and surface dissolution.
 */
export class CrawlerEntity {
  constructor({ onStateChange } = {}) {
    this.name = 'THE CRAWLER';
    this.code = 'VOID-077 // CLASS VI';
    this.threat = 'CRITICAL';
    this.resonance = '92.4 MHz';

    this.root = new THREE.Group();
    this.root.name = 'CrawlerEntity';

    this.disposables = [];
    this.stateMachine = new EntityStateMachine(EntityState.IDLE, onStateChange);

    // Particles configuration
    this.particleCount = 30;
    this.particlePositions = null;

    // Pre-allocated math objects to avoid per-frame GC allocations
    this._targetYaw = 0;
    this._currentYaw = 0;
    this._localCamPos = new THREE.Vector3();

    this.dissolveProgress = 0;
    this.onDissolveComplete = null;

    this.initModel();
    this.initParticles();
  }

  initModel() {
    // 1. Shaded Chitin Materials
    this.chitinMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c1410,
      emissive: 0x05120a,
      roughness: 0.38,
      metalness: 0.65,
      transparent: true,
      opacity: 1.0,
    });
    this.disposables.push(this.chitinMaterial);

    this.primaryEyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Menacing glowing amber
      transparent: true,
      opacity: 1.0,
    });
    this.disposables.push(this.primaryEyeMaterial);

    this.secondaryEyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xef4444, // Eerie crimson lateral eyes
      transparent: true,
      opacity: 0.9,
    });
    this.disposables.push(this.secondaryEyeMaterial);

    this.spineMaterial = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });
    this.disposables.push(this.spineMaterial);

    // 2. Main Body Container (carapace + head + abdomen)
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.set(0, 0.22, 0); // ~22cm above floor
    this.root.add(this.bodyGroup);

    // Flattened Thorax Carapace
    const thoraxGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.14, 8);
    thoraxGeo.scale(1.15, 1.0, 0.85);
    this.disposables.push(thoraxGeo);
    this.thoraxMesh = new THREE.Mesh(thoraxGeo, this.chitinMaterial);
    this.bodyGroup.add(this.thoraxMesh);

    // Ridged Abdomen (Rear Tail)
    const abdomenGeo = new THREE.ConeGeometry(0.18, 0.38, 6);
    abdomenGeo.rotateX(-Math.PI / 2.2);
    this.disposables.push(abdomenGeo);
    this.abdomenMesh = new THREE.Mesh(abdomenGeo, this.chitinMaterial);
    this.abdomenMesh.position.set(0, 0.04, -0.32);
    this.bodyGroup.add(this.abdomenMesh);

    // Thorax Spines
    const spineGeo = new THREE.ConeGeometry(0.04, 0.16, 4);
    this.disposables.push(spineGeo);
    for (let i = -1; i <= 1; i += 2) {
      const spine = new THREE.Mesh(spineGeo, this.spineMaterial);
      spine.position.set(i * 0.14, 0.1, -0.05);
      spine.rotation.z = -i * 0.4;
      this.bodyGroup.add(spine);
    }

    // 3. Head & Ocular Cluster
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.02, 0.24);
    this.bodyGroup.add(this.headGroup);

    const headGeo = new THREE.BoxGeometry(0.22, 0.11, 0.16);
    this.disposables.push(headGeo);
    this.headMesh = new THREE.Mesh(headGeo, this.chitinMaterial);
    this.headGroup.add(this.headMesh);

    // Primary Eyes (Center Amber)
    const eyeGeoLarge = new THREE.SphereGeometry(0.02, 8, 8);
    this.disposables.push(eyeGeoLarge);

    const eyeL = new THREE.Mesh(eyeGeoLarge, this.primaryEyeMaterial);
    eyeL.position.set(-0.045, 0.025, 0.082);
    this.headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeoLarge, this.primaryEyeMaterial);
    eyeR.position.set(0.045, 0.025, 0.082);
    this.headGroup.add(eyeR);

    // Secondary Eyes (Lateral Crimson)
    const eyeGeoSmall = new THREE.SphereGeometry(0.013, 8, 8);
    this.disposables.push(eyeGeoSmall);

    const eyeLatL = new THREE.Mesh(eyeGeoSmall, this.secondaryEyeMaterial);
    eyeLatL.position.set(-0.085, 0.01, 0.07);
    this.headGroup.add(eyeLatL);

    const eyeLatR = new THREE.Mesh(eyeGeoSmall, this.secondaryEyeMaterial);
    eyeLatR.position.set(0.085, 0.01, 0.07);
    this.headGroup.add(eyeLatR);

    // Eye Point Light
    this.eyeLight = new THREE.PointLight(0xf59e0b, 2.0, 3.5);
    this.eyeLight.position.set(0, 0.04, 0.15);
    this.headGroup.add(this.eyeLight);

    // 4. Six Articulated Multi-Jointed Limbs
    this.legs = [];
    const upperLegGeo = new THREE.CylinderGeometry(0.022, 0.014, 0.32, 6);
    this.disposables.push(upperLegGeo);

    const lowerLegGeo = new THREE.CylinderGeometry(0.014, 0.006, 0.38, 6);
    this.disposables.push(lowerLegGeo);

    // 3 Left Legs, 3 Right Legs
    const legConfigs = [
      { side: -1, z: 0.14, angleZ: 0.6, yaw: 0.35, isFront: true },   // Front Left
      { side: -1, z: 0.0, angleZ: 0.7, yaw: 0.0, isFront: false },    // Middle Left
      { side: -1, z: -0.14, angleZ: 0.6, yaw: -0.35, isFront: false }, // Rear Left
      { side: 1, z: 0.14, angleZ: -0.6, yaw: -0.35, isFront: true },   // Front Right
      { side: 1, z: 0.0, angleZ: -0.7, yaw: 0.0, isFront: false },    // Middle Right
      { side: 1, z: -0.14, angleZ: -0.6, yaw: 0.35, isFront: false }, // Rear Right
    ];

    legConfigs.forEach((cfg, idx) => {
      const legRoot = new THREE.Group();
      legRoot.position.set(cfg.side * 0.22, 0, cfg.z);
      legRoot.rotation.y = cfg.yaw;
      this.bodyGroup.add(legRoot);

      // Upper leg (angles up from thorax)
      const upperLeg = new THREE.Group();
      upperLeg.rotation.z = cfg.angleZ;

      const upperMesh = new THREE.Mesh(upperLegGeo, this.chitinMaterial);
      upperMesh.position.set(0, 0.14, 0);
      upperLeg.add(upperMesh);
      legRoot.add(upperLeg);

      // Lower leg / claw (angles sharply down to floor)
      const lowerLeg = new THREE.Group();
      lowerLeg.position.set(0, 0.28, 0);
      lowerLeg.rotation.z = cfg.side * -1.25;

      const lowerMesh = new THREE.Mesh(lowerLegGeo, this.chitinMaterial);
      lowerMesh.position.set(0, -0.18, 0);
      lowerLeg.add(lowerMesh);
      upperLeg.add(lowerLeg);

      this.legs.push({
        root: legRoot,
        upper: upperLeg,
        lower: lowerLeg,
        baseAngleZ: cfg.angleZ,
        isFront: cfg.isFront,
        side: cfg.side,
        index: idx,
      });
    });
  }

  initParticles() {
    const count = this.particleCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = Math.random() * 0.6 + 0.15;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3 + 0] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 0.15; // stay close to floor
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particlePositions = positions;
    this.disposables.push(geometry);

    this.particleMaterial = new THREE.PointsMaterial({
      color: 0x10b981,
      size: 0.024,
      transparent: true,
      opacity: 0.7,
    });
    this.disposables.push(this.particleMaterial);

    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.root.add(this.particles);
  }

  triggerDisturbed() {
    if (this.stateMachine.canTransitionTo(EntityState.DISTURBED)) {
      this.stateMachine.transitionTo(EntityState.DISTURBED);

      // Eyes flare into piercing crimson
      this.primaryEyeMaterial.color.setHex(0xff0033);
      this.eyeLight.color.setHex(0xff0022);
      this.eyeLight.intensity = 4.0;
      this.particleMaterial.color.setHex(0xff3344);
    }
  }

  triggerDissolve(onComplete = null) {
    if (this.stateMachine.canTransitionTo(EntityState.DISAPPEARING)) {
      this.stateMachine.transitionTo(EntityState.DISAPPEARING);
      this.dissolveProgress = 0;
      this.onDissolveComplete = onComplete;
    }
  }

  update(elapsedTime, delta, cameraWorldPos) {
    const state = this.stateMachine.getCurrentState();
    if (state === EntityState.INACTIVE) return;

    this.stateMachine.update(delta);
    const stateTime = this.stateMachine.getStateTime();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. STATE-SPECIFIC ANIMATION
    switch (state) {
      case EntityState.IDLE:
        // Subtle carapace heaving & limb micro-twitching
        if (!prefersReducedMotion) {
          const heave = Math.sin(elapsedTime * 2.5) * 0.015;
          this.bodyGroup.position.y = 0.22 + heave;

          for (let i = 0; i < this.legs.length; i++) {
            const leg = this.legs[i];
            const twitch = Math.sin(elapsedTime * 3.5 + leg.index) * 0.04;
            leg.upper.rotation.z = leg.baseAngleZ + twitch;
          }
        }

        if (stateTime > 2.0) {
          this.stateMachine.transitionTo(EntityState.OBSERVING);
        }
        break;

      case EntityState.OBSERVING:
        // Bounded orientation toward player camera position
        if (cameraWorldPos && !prefersReducedMotion) {
          this._localCamPos.copy(cameraWorldPos);
          this.root.worldToLocal(this._localCamPos);

          const angle = Math.atan2(this._localCamPos.x, this._localCamPos.z);
          const clampedAngle = THREE.MathUtils.clamp(angle, -Math.PI / 3.5, Math.PI / 3.5);

          this._targetYaw = clampedAngle;
          this._currentYaw = THREE.MathUtils.lerp(this._currentYaw, this._targetYaw, 0.05);
          this.root.rotation.y = this._currentYaw;
        }

        // Subdued eye pulse
        if (!prefersReducedMotion) {
          this.eyeLight.intensity = 2.0 + Math.sin(elapsedTime * 4.0) * 0.5;
        }
        break;

      case EntityState.DISTURBED:
        // Threat Posture: Carapace rears back, front limbs lift aggressively, spasmodic twitch
        if (!prefersReducedMotion) {
          const rearAngle = -0.38 + Math.sin(stateTime * 25.0) * 0.05 * Math.exp(-stateTime * 1.0);
          this.bodyGroup.rotation.x = rearAngle;
          this.bodyGroup.position.y = 0.28;

          // Lift front two limbs into strike position
          for (let i = 0; i < this.legs.length; i++) {
            const leg = this.legs[i];
            if (leg.isFront) {
              leg.upper.rotation.z = leg.baseAngleZ * 0.4 + Math.sin(stateTime * 30.0) * 0.08;
            } else {
              leg.upper.rotation.z = leg.baseAngleZ + Math.sin(stateTime * 20.0) * 0.04;
            }
          }
        }

        if (stateTime > 2.5) {
          this.primaryEyeMaterial.color.setHex(0xf59e0b);
          this.eyeLight.color.setHex(0xf59e0b);
          this.eyeLight.intensity = 2.0;
          this.particleMaterial.color.setHex(0x10b981);
          this.bodyGroup.rotation.x = 0;
          this.bodyGroup.position.y = 0.22;
          this.stateMachine.transitionTo(EntityState.OBSERVING);
        }
        break;

      case EntityState.DISAPPEARING:
        // Sinks into ground and dissolves
        this.dissolveProgress += delta / 1.5;
        const remainingAlpha = Math.max(0, 1.0 - this.dissolveProgress);

        this.chitinMaterial.opacity = remainingAlpha;
        this.primaryEyeMaterial.opacity = remainingAlpha;
        this.secondaryEyeMaterial.opacity = remainingAlpha * 0.9;
        this.spineMaterial.opacity = remainingAlpha * 0.3;
        this.particleMaterial.opacity = remainingAlpha * 0.7;
        this.eyeLight.intensity = remainingAlpha * 2.0;

        this.bodyGroup.position.y = 0.22 - this.dissolveProgress * 0.2;

        if (this.dissolveProgress >= 1.0) {
          this.stateMachine.transitionTo(EntityState.INACTIVE);
          this.root.visible = false;
          if (this.onDissolveComplete) {
            this.onDissolveComplete();
          }
        }
        break;
    }

    // 2. Skittering floor particles
    if (this.particles && this.particlePositions && !prefersReducedMotion) {
      const pos = this.particlePositions;
      for (let i = 0; i < this.particleCount; i++) {
        pos[i * 3 + 1] = 0.02 + Math.sin(elapsedTime * 4.0 + i) * 0.015;
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
