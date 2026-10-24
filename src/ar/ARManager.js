import * as THREE from 'three';
import { WatcherEntity } from './entities/WatcherEntity';
import { PlacementReticle } from './PlacementReticle';

/**
 * Clean AR Manager module orchestrating WebXR immersive-ar session,
 * Three.js scene, surface hit-testing, placement, and resource disposal.
 */
export class ARManager {
  constructor({
    domOverlayRoot,
    canvasContainer,
    onSurfaceStateChange,
    onEntityPlaced,
    onEntityStateChange,
    onError,
    onSessionEnded,
  }) {
    this.domOverlayRoot = domOverlayRoot;
    this.canvasContainer = canvasContainer;
    this.onSurfaceStateChange = onSurfaceStateChange;
    this.onEntityPlaced = onEntityPlaced;
    this.onEntityStateChange = onEntityStateChange;
    this.onError = onError;
    this.onSessionEnded = onSessionEnded;

    // Session state
    this.isSessionActive = false;
    this.isStarting = false;
    this.xrSession = null;
    this.hitTestSource = null;
    this.referenceSpace = null;
    this.viewerSpace = null;

    // Three.js instances
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.reticle = null;
    this.clock = new THREE.Clock();

    // Collection of placed entities
    this.placedEntities = [];

    // Reusable math objects to prevent per-frame garbage collection
    this._tempMatrix = new THREE.Matrix4();
    this._tempCamPos = new THREE.Vector3();

    // Bound event handlers
    this.handleXRSelect = this.handleXRSelect.bind(this);
    this.handleXREnd = this.handleXREnd.bind(this);
  }

  /**
   * Checks whether WebXR and immersive-ar are supported
   */
  static async checkSupport() {
    if (typeof navigator === 'undefined' || !navigator.xr) {
      return {
        supported: false,
        reason: 'WebXR Device API is not available in this browser (navigator.xr undefined).',
      };
    }
    try {
      const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
      return {
        supported: isSupported,
        reason: isSupported
          ? null
          : 'immersive-ar mode is not supported on this device. Real-world AR tracking requires ARCore on Android Chrome or an AR headset.',
      };
    } catch (err) {
      return {
        supported: false,
        reason: `WebXR Check Error: ${err.message}`,
      };
    }
  }

  /**
   * Starts the WebXR immersive-ar session
   */
  async startSession() {
    if (this.isSessionActive || this.isStarting) {
      console.warn('ARManager: Session already active or starting.');
      return;
    }
    this.isStarting = true;

    try {
      // 1. Verify support first
      const support = await ARManager.checkSupport();
      if (!support.supported) {
        throw new Error(support.reason);
      }

      // 2. Request WebXR session with hit-test as requiredFeature
      const sessionOptions = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['local-floor', 'dom-overlay'],
      };

      if (this.domOverlayRoot) {
        sessionOptions.domOverlay = { root: this.domOverlayRoot };
      }

      const session = await navigator.xr.requestSession('immersive-ar', sessionOptions);
      this.xrSession = session;

      // 3. Setup Three.js scene & lights
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

      const ambientLight = new THREE.AmbientLight(0x333333, 1.2);
      this.scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
      dirLight.position.set(0.5, 2.5, 0.5);
      this.scene.add(dirLight);

      const horrorLight = new THREE.PointLight(0xff2a2a, 2.0, 8);
      horrorLight.position.set(0, 1.8, 0);
      this.scene.add(horrorLight);

      // 4. Setup Placement Reticle
      this.reticle = new PlacementReticle();
      this.scene.add(this.reticle.root);

      // 5. Setup WebGL Renderer with alpha transparency for camera passthrough
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.xr.enabled = true;
      this.renderer.xr.setReferenceSpaceType('local');

      if (this.canvasContainer) {
        this.canvasContainer.innerHTML = '';
        this.canvasContainer.appendChild(this.renderer.domElement);
      }

      await this.renderer.xr.setSession(session);

      // 6. Request reference spaces & hit-test source
      this.viewerSpace = await session.requestReferenceSpace('viewer');
      this.referenceSpace = await session
        .requestReferenceSpace('local-floor')
        .catch(() => session.requestReferenceSpace('local'));

      this.hitTestSource = await session.requestHitTestSource({ space: this.viewerSpace });

      // 7. Attach session listeners
      session.addEventListener('select', this.handleXRSelect);
      session.addEventListener('end', this.handleXREnd);

      this.isSessionActive = true;
      this.isStarting = false;

      // 8. Start WebXR animation loop
      this.clock.start();
      this.renderer.setAnimationLoop((timestamp, frame) => this.onFrame(timestamp, frame));
    } catch (err) {
      console.error('ARManager: Initialization failure', err);
      this.isStarting = false;
      this.isSessionActive = false;
      this.cleanup();
      if (this.onError) {
        this.onError(err.message || 'Failed to start WebXR immersive-ar session.');
      }
    }
  }

  /**
   * Per-frame WebXR render loop
   */
  onFrame(timestamp, frame) {
    if (!frame || !this.renderer) return;

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Perform Hit-Testing
    if (this.hitTestSource && this.referenceSpace && this.reticle) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(this.referenceSpace);
        if (pose) {
          this._tempMatrix.fromArray(pose.transform.matrix);
          this.reticle.updateMatrix(this._tempMatrix);
          if (!this.reticle.isVisible()) {
            this.reticle.setVisible(true);
            if (this.onSurfaceStateChange) this.onSurfaceStateChange(true);
          }
        }
      } else {
        if (this.reticle.isVisible()) {
          this.reticle.setVisible(false);
          if (this.onSurfaceStateChange) this.onSurfaceStateChange(false);
        }
      }
    }

    // 2. Update placed procedural entities
    if (this.camera) {
      this.camera.getWorldPosition(this._tempCamPos);
      for (let i = 0; i < this.placedEntities.length; i++) {
        this.placedEntities[i].update(elapsedTime, delta, this._tempCamPos);
      }
    }

    // 3. Render scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Handles user tapping the screen in XR space
   */
  handleXRSelect() {
    this.placeEntityAtCurrentReticle();
  }

  /**
   * Explicitly places an entity at the reticle's current world-space pose
   */
  placeEntityAtCurrentReticle() {
    if (!this.reticle || !this.reticle.isVisible() || !this.scene || !this.camera) {
      return false;
    }

    // Instantiate THE WATCHER (production-quality 3D horror entity)
    const entity = new WatcherEntity({
      onStateChange: (newState, prevState) => {
        if (this.onEntityStateChange) {
          this.onEntityStateChange(newState, prevState, entity);
        }
      },
    });

    // Position in world space from reticle matrix pose
    entity.root.position.setFromMatrixPosition(this.reticle.getMatrix());

    // Face the camera horizontally upon initial spawn
    this.camera.getWorldPosition(this._tempCamPos);
    entity.root.lookAt(this._tempCamPos.x, entity.root.position.y, this._tempCamPos.z);

    this.scene.add(entity.root);
    this.placedEntities.push(entity);

    const pos = {
      x: entity.root.position.x.toFixed(2),
      y: entity.root.position.y.toFixed(2),
      z: entity.root.position.z.toFixed(2),
    };

    if (this.onEntityPlaced) {
      this.onEntityPlaced(this.placedEntities.length, pos, entity);
    }

    return true;
  }

  /**
   * Scans the currently placed entity, triggering DISTURBED reaction
   */
  scanPlacedEntities() {
    if (this.placedEntities.length === 0) return null;
    const target = this.placedEntities[this.placedEntities.length - 1];
    target.triggerDisturbed();
    return {
      name: target.name,
      code: target.code,
      threat: target.threat,
      resonance: target.resonance,
    };
  }

  /**
   * Dissolves and removes placed entities cleanly from AR scene
   */
  purgePlacedEntities(onComplete = null) {
    if (this.placedEntities.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    let remaining = this.placedEntities.length;
    const entitiesToPurge = [...this.placedEntities];
    this.placedEntities = [];

    entitiesToPurge.forEach((entity) => {
      entity.triggerDissolve(() => {
        entity.dispose();
        remaining--;
        if (remaining === 0 && onComplete) {
          onComplete();
        }
      });
    });
  }

  /**
   * Handles WebXR session ending
   */
  handleXREnd() {
    this.cleanup();
    if (this.onSessionEnded) {
      this.onSessionEnded();
    }
  }

  /**
   * Ends session gracefully
   */
  endSession() {
    if (this.xrSession) {
      this.xrSession.end().catch(() => {});
    } else {
      this.handleXREnd();
    }
  }

  /**
   * Completely disposes all Three.js, WebXR, and DOM resources
   */
  cleanup() {
    this.isSessionActive = false;
    this.isStarting = false;

    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
    }

    if (this.hitTestSource) {
      try {
        this.hitTestSource.cancel();
      } catch {
        // ignore
      }
      this.hitTestSource = null;
    }

    if (this.xrSession) {
      this.xrSession.removeEventListener('select', this.handleXRSelect);
      this.xrSession.removeEventListener('end', this.handleXREnd);
      this.xrSession = null;
    }

    // Dispose reticle
    if (this.reticle) {
      this.reticle.dispose();
      this.reticle = null;
    }

    // Dispose all placed entities
    for (let i = 0; i < this.placedEntities.length; i++) {
      this.placedEntities[i].dispose();
    }
    this.placedEntities = [];

    // Dispose scene children
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.scene = null;
    }

    // Dispose renderer and remove canvas
    if (this.renderer) {
      this.renderer.dispose();
      if (this.canvasContainer && this.renderer.domElement) {
        if (this.canvasContainer.contains(this.renderer.domElement)) {
          this.canvasContainer.removeChild(this.renderer.domElement);
        }
      }
      this.renderer = null;
    }
  }
}
