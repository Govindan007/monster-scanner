import * as THREE from 'three';

/**
 * 3D Real-World Surface Placement Reticle
 * Displayed dynamically when WebXR Hit-Test detects a horizontal/vertical surface.
 */
export class PlacementReticle {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'PlacementReticle';
    this.root.matrixAutoUpdate = false;
    this.root.visible = false;

    this.disposables = [];
    this.initReticle();
  }

  initReticle() {
    // 1. Outer tactical ring
    const ringGeo = new THREE.RingGeometry(0.16, 0.2, 32);
    ringGeo.rotateX(-Math.PI / 2); // align flat to surface
    this.disposables.push(ringGeo);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff2a2a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.disposables.push(ringMat);

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.root.add(ringMesh);
    this.ringMesh = ringMesh;

    // 2. Inner target dot
    const innerGeo = new THREE.CircleGeometry(0.035, 16);
    innerGeo.rotateX(-Math.PI / 2);
    this.disposables.push(innerGeo);

    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    this.disposables.push(innerMat);

    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    this.root.add(innerMesh);

    // 3. Four corner ticks
    const tickMat = new THREE.LineBasicMaterial({
      color: 0xff2a2a,
      linewidth: 2,
    });
    this.disposables.push(tickMat);

    const points = [
      new THREE.Vector3(-0.28, 0, 0),
      new THREE.Vector3(-0.22, 0, 0),
      new THREE.Vector3(0.22, 0, 0),
      new THREE.Vector3(0.28, 0, 0),
      new THREE.Vector3(0, 0, -0.28),
      new THREE.Vector3(0, 0, -0.22),
      new THREE.Vector3(0, 0, 0.22),
      new THREE.Vector3(0, 0, 0.28),
    ];
    const tickGeo = new THREE.BufferGeometry().setFromPoints(points);
    this.disposables.push(tickGeo);

    const ticks = new THREE.LineSegments(tickGeo, tickMat);
    this.root.add(ticks);
  }

  updateMatrix(matrix) {
    this.root.matrix.copy(matrix);
  }

  setVisible(visible) {
    this.root.visible = visible;
  }

  isVisible() {
    return this.root.visible;
  }

  getMatrix() {
    return this.root.matrix;
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
