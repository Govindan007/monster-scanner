import * as THREE from 'three';

/**
 * Procedural 3D Shadow Humanoid Entity
 * Real-world human scale (~1.8m tall).
 * Features head, torso, arms, legs, glowing pale eyes, and drifting shadow particles.
 * ZERO external downloads - built entirely from Three.js geometries.
 */
export class ProceduralShadowEntity {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'ProceduralShadowEntity';

    this.disposables = [];
    this.particlePositions = null;
    this.particleVelocities = [];
    this.particleCount = 50;

    this.initGeometry();
    this.initParticles();
  }

  initGeometry() {
    // Dark, nearly black material for shadow entity silhouette
    const shadowMaterial = new THREE.MeshStandardMaterial({
      color: 0x05070a,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.disposables.push(shadowMaterial);

    const eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    this.disposables.push(eyeMaterial);

    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    this.disposables.push(wireframeMaterial);

    // 1. LEGS (Standing firmly from y = 0 up to y = 0.92m)
    const legGeo = new THREE.CylinderGeometry(0.032, 0.02, 0.92, 8);
    this.disposables.push(legGeo);

    // Left leg
    const leftLeg = new THREE.Mesh(legGeo, shadowMaterial);
    leftLeg.position.set(-0.1, 0.46, 0);
    this.root.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeo, shadowMaterial);
    rightLeg.position.set(0.1, 0.46, 0);
    this.root.add(rightLeg);

    // 2. TORSO & WAIST (y = 0.92m to 1.52m)
    // Waist/Pelvis
    const pelvisGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.22, 8);
    this.disposables.push(pelvisGeo);
    const pelvis = new THREE.Mesh(pelvisGeo, shadowMaterial);
    pelvis.position.set(0, 1.0, 0);
    this.root.add(pelvis);

    // Emaciated upper torso (tapered)
    const torsoGeo = new THREE.ConeGeometry(0.19, 0.5, 8);
    this.disposables.push(torsoGeo);
    const torso = new THREE.Mesh(torsoGeo, shadowMaterial);
    torso.rotation.x = Math.PI; // upside down cone (broad shoulders, thin waist)
    torso.position.set(0, 1.32, 0);
    this.root.add(torso);
    this.torsoMesh = torso;

    // Rib cage atmospheric aura
    const ribGeo = new THREE.CylinderGeometry(0.2, 0.14, 0.38, 6);
    this.disposables.push(ribGeo);
    const ribAura = new THREE.Mesh(ribGeo, wireframeMaterial);
    ribAura.position.set(0, 1.32, 0);
    this.root.add(ribAura);
    this.ribAura = ribAura;

    // 3. NECK & HEAD (y = 1.52m to 1.82m)
    const neckGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.18, 8);
    this.disposables.push(neckGeo);
    const neck = new THREE.Mesh(neckGeo, shadowMaterial);
    neck.position.set(0, 1.58, 0);
    this.root.add(neck);

    // Elongated distorted head with featureless face
    const headGeo = new THREE.SphereGeometry(0.11, 16, 16);
    headGeo.scale(0.85, 1.45, 0.95);
    this.disposables.push(headGeo);
    const head = new THREE.Mesh(headGeo, shadowMaterial);
    head.position.set(0, 1.74, 0);
    this.root.add(head);
    this.headMesh = head;

    // Distinct glowing eyes (asymmetric pale pinpoints)
    const eyeGeo = new THREE.SphereGeometry(0.015, 8, 8);
    this.disposables.push(eyeGeo);

    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(-0.038, 1.76, 0.092);
    this.root.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(0.036, 1.77, 0.092);
    this.root.add(rightEye);

    // Subtle eye glow point light
    this.eyeLight = new THREE.PointLight(0xff3333, 1.8, 2.0);
    this.eyeLight.position.set(0, 1.76, 0.14);
    this.root.add(this.eyeLight);

    // 4. ELONGATED ARMS (draping past knees, ~1.1m long)
    const armGeo = new THREE.CylinderGeometry(0.024, 0.015, 1.05, 6);
    this.disposables.push(armGeo);

    // Left arm group
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.21, 1.5, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, shadowMaterial);
    leftArmMesh.position.set(0, -0.5, 0);
    leftArmMesh.rotation.z = 0.06;
    this.leftArm.add(leftArmMesh);

    // Finger tendrils
    const fingerGeo = new THREE.CylinderGeometry(0.005, 0.002, 0.2, 4);
    this.disposables.push(fingerGeo);
    for (let i = -1; i <= 1; i++) {
      const finger = new THREE.Mesh(fingerGeo, shadowMaterial);
      finger.position.set(i * 0.014, -1.08, 0);
      finger.rotation.z = i * 0.12;
      this.leftArm.add(finger);
    }
    this.root.add(this.leftArm);

    // Right arm group
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.21, 1.5, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, shadowMaterial);
    rightArmMesh.position.set(0, -0.5, 0);
    rightArmMesh.rotation.z = -0.06;
    this.rightArm.add(rightArmMesh);

    for (let i = -1; i <= 1; i++) {
      const finger = new THREE.Mesh(fingerGeo, shadowMaterial);
      finger.position.set(i * 0.014, -1.08, 0);
      finger.rotation.z = -i * 0.12;
      this.rightArm.add(finger);
    }
    this.root.add(this.rightArm);
  }

  initParticles() {
    // Subtle shadow floating particles drifting around entity
    const count = this.particleCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 0.9; // x: radius ~0.45m
      positions[i * 3 + 1] = Math.random() * 2.0;         // y: height up to 2m
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.9; // z: radius ~0.45m

      this.particleVelocities.push({
        vy: Math.random() * 0.15 + 0.05,
        w: Math.random() * 2.0 + 1.0,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particlePositions = positions;
    this.disposables.push(geometry);

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x991111,
      size: 0.025,
      transparent: true,
      opacity: 0.65,
    });
    this.disposables.push(particleMaterial);

    this.particles = new THREE.Points(geometry, particleMaterial);
    this.root.add(this.particles);
  }

  update(elapsedTime, delta, _cameraWorldPos) {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      // 1. Subtle breathing
      if (this.torsoMesh) {
        const breathe = 1.0 + Math.sin(elapsedTime * 2.4) * 0.03;
        this.torsoMesh.scale.set(breathe, 1.0, breathe);
      }

      // 2. Arms gentle micro-sway
      if (this.leftArm && this.rightArm) {
        this.leftArm.rotation.x = Math.sin(elapsedTime * 1.6) * 0.05;
        this.rightArm.rotation.x = -Math.sin(elapsedTime * 1.6) * 0.05;
      }

      // 3. Head micro-tilt
      if (this.headMesh) {
        this.headMesh.rotation.y = Math.sin(elapsedTime * 0.9) * 0.06;
        this.headMesh.rotation.z = Math.cos(elapsedTime * 1.3) * 0.03;
      }

      // 4. Eye glow pulse
      if (this.eyeLight) {
        this.eyeLight.intensity = 1.4 + Math.sin(elapsedTime * 3.5) * 0.7;
      }

      // 5. Rib cage wireframe slow spin
      if (this.ribAura) {
        this.ribAura.rotation.y += 0.008;
      }

      // 6. Floating shadow particles drift upwards
      if (this.particles && this.particlePositions) {
        const posAttr = this.particles.geometry.attributes.position;
        const count = this.particleCount;

        for (let i = 0; i < count; i++) {
          const idx = i * 3;
          const vel = this.particleVelocities[i];

          // Upward drift
          this.particlePositions[idx + 1] += vel.vy * delta;
          // Gentle spiral drift
          this.particlePositions[idx + 0] += Math.sin(elapsedTime * vel.w + i) * 0.001;

          // Recycle particle when it floats above head
          if (this.particlePositions[idx + 1] > 2.2) {
            this.particlePositions[idx + 1] = 0.1;
            this.particlePositions[idx + 0] = (Math.random() - 0.5) * 0.8;
            this.particlePositions[idx + 2] = (Math.random() - 0.5) * 0.8;
          }
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  dispose() {
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
