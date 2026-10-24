import * as THREE from 'three';

/**
 * 3D Real-World Surface Placement Reticle
 * Displayed dynamically when WebXR Hit-Test detects a horizontal or vertical plane.
 * Uses decomposed transforms to ensure reliable matrixWorld updates and zero clipping.
 */
export class PlacementReticle {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'PlacementReticle';
    this.root.visible = false;
    this.root.matrixAutoUpdate = true;
    this.root.renderOrder = 999;

    this.disposables = [];
    this._tempPos = new THREE.Vector3();
    this._tempQuat = new THREE.Quaternion();
    this._tempScale = new THREE.Vector3();

    this.initReticle();
  }

  initReticle() {
    // 1. Outer tactical ring (align flat to surface)
    const ringGeo = new THREE.RingGeometry(0.18, 0.22, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.disposables.push(ringGeo);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff, // High-visibility tactical cyan
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });
    this.disposables.push(ringMat);

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.renderOrder = 999;
    this.root.add(ringMesh);
    this.ringMesh = ringMesh;

    // 2. Inner targeting ring
    const innerRingGeo = new THREE.RingGeometry(0.06, 0.08, 24);
    innerRingGeo.rotateX(-Math.PI / 2);
    this.disposables.push(innerRingGeo);

    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff2a2a, // High-contrast red accent
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    this.disposables.push(innerRingMat);

    const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRingMesh.renderOrder = 999;
    this.root.add(innerRingMesh);

    // 3. Center target core
    const centerGeo = new THREE.CircleGeometry(0.022, 16);
    centerGeo.rotateX(-Math.PI / 2);
    this.disposables.push(centerGeo);

    const centerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
    });
    this.disposables.push(centerMat);

    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    centerMesh.renderOrder = 999;
    this.root.add(centerMesh);

    // 4. Four crosshair ticks
    const tickMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      linewidth: 3,
      depthTest: false,
    });
    this.disposables.push(tickMat);

    const points = [
      new THREE.Vector3(-0.32, 0, 0),
      new THREE.Vector3(-0.24, 0, 0),
      new THREE.Vector3(0.24, 0, 0),
      new THREE.Vector3(0.32, 0, 0),
      new THREE.Vector3(0, 0, -0.32),
      new THREE.Vector3(0, 0, -0.24),
      new THREE.Vector3(0, 0, 0.24),
      new THREE.Vector3(0, 0, 0.32),
    ];
    const tickGeo = new THREE.BufferGeometry().setFromPoints(points);
    this.disposables.push(tickGeo);

    const ticks = new THREE.LineSegments(tickGeo, tickMat);
    ticks.renderOrder = 999;
    this.root.add(ticks);
  }

  /**
   * Updates reticle transform using decomposed pose matrix
   * Ensures matrix and matrixWorld are automatically updated by Three.js
   */
  updateFromMatrix(matrix) {
    matrix.decompose(this._tempPos, this._tempQuat, this._tempScale);
    this.root.position.copy(this._tempPos);
    this.root.quaternion.copy(this._tempQuat);
    this.root.scale.set(1, 1, 1);
    this.root.updateMatrixWorld(true);
  }

  setVisible(visible) {
    this.root.visible = visible;
  }

  isVisible() {
    return this.root.visible;
  }

  getPosition() {
    return this.root.position;
  }

  getQuaternion() {
    return this.root.quaternion;
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
