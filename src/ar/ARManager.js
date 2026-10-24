import * as THREE from 'three';
import { getDefaultEntity, getEntityById } from './entities/EntityRegistry';
import { PlacementReticle } from './PlacementReticle';
import { EncounterDirector, EncounterState, ScanOutcome } from './encounter/EncounterDirector';

export { EncounterState, ScanOutcome };

/**
 * Clean AR Manager module orchestrating WebXR immersive-ar session,
 * Three.js scene, surface hit-testing, placement, and resource disposal.
 * 
 * Enforces single-session ownership, exact reference space alignment,
 * robust hit-testing and real-time mobile AR diagnostics.
 */
export class ARManager {
  // Authoritative static state tracking the browser's single active WebXR session
  static _activeXRSession = null;
  static _inFlightSessionPromise = null;
  static _activeEndingPromise = null;
  static _activeManagerInstance = null;

  constructor({
    domOverlayRoot,
    canvasContainer,
    onSurfaceStateChange,
    onEntityPlaced,
    onEntityStateChange,
    onError,
    onSessionEnded,
    onDiagnostics,
    onEncounterStateChange,
    onScanProgress,
    onScanOutcome,
    onEncounterResolved,
    onEncounterEscaped,
  }) {
    this.domOverlayRoot = domOverlayRoot;
    this.canvasContainer = canvasContainer;
    this.onSurfaceStateChange = onSurfaceStateChange;
    this.onEntityPlaced = onEntityPlaced;
    this.onEntityStateChange = onEntityStateChange;
    this.onError = onError;
    this.onSessionEnded = onSessionEnded;
    this.onDiagnostics = onDiagnostics;
    this.onEncounterStateChange = onEncounterStateChange;
    this.onScanProgress = onScanProgress;
    this.onScanOutcome = onScanOutcome;
    this.onEncounterResolved = onEncounterResolved;
    this.onEncounterEscaped = onEncounterEscaped;

    // Active Entity Definition from Registry
    this.selectedEntityDef = getDefaultEntity();

    // Encounter Director (Phase 4 State Machine)
    this.encounterDirector = new EncounterDirector({
      onStateChange: (newState, prevState, context) => {
        this.diagnostics.encounterState = newState;
        this.emitDiagnostics();
        if (this.onEncounterStateChange) {
          this.onEncounterStateChange(newState, prevState, context);
        }
      },
      onScanProgress: (prog) => {
        if (this.onScanProgress) this.onScanProgress(prog);
      },
      onScanOutcome: (outcome) => {
        if (this.onScanOutcome) this.onScanOutcome(outcome);
      },
      onEncounterResolved: (result) => {
        if (this.onEncounterResolved) this.onEncounterResolved(result);
      },
      onEncounterEscaped: () => {
        this.placedEntities = [];
        this.diagnostics.sceneEntityCount = 0;
        this.emitDiagnostics();
        if (this.onEncounterEscaped) this.onEncounterEscaped();
      },
    });

    // Instance lifecycle state
    this._disposed = false;
    this.isSessionActive = false;
    this.isStarting = false;
    this.xrSession = null;
    this.hitTestSource = null;
    this.viewerSpace = null;

    // Hit-testing cached state
    this.latestHitPose = {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      valid: false,
    };

    // Diagnostics telemetry
    this.diagnostics = {
      sessionActive: false,
      loopRunning: false,
      frameCount: 0,
      hitSourceReady: false,
      surfaceDetected: false,
      hitCount: 0,
      sceneEntityCount: 0,
      selectedEntity: this.selectedEntityDef.name,
      encounterState: EncounterState.DORMANT,
      distanceToEntity: null,
      lastPose: null,
      lastError: null,
    };

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
   * Authoritatively ends any active WebXR session across all instances
   */
  static async endAuthoritativeSession() {
    if (ARManager._activeEndingPromise) {
      try {
        await ARManager._activeEndingPromise;
      } catch {
        // ignore
      }
      return;
    }

    const session = ARManager._activeXRSession;
    if (!session) return;

    ARManager._activeEndingPromise = (async () => {
      try {
        await session.end();
      } catch (err) {
        console.warn('ARManager: Error during session.end():', err);
      } finally {
        if (ARManager._activeXRSession === session) {
          ARManager._activeXRSession = null;
        }
        ARManager._activeEndingPromise = null;
      }
    })();

    await ARManager._activeEndingPromise;
  }

  /**
   * Internal helper requesting a new WebXR session with single-flight locking
   */
  async _requestNewXRSession() {
    if (ARManager._inFlightSessionPromise) {
      return await ARManager._inFlightSessionPromise;
    }

    const sessionOptions = {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['local-floor', 'dom-overlay'],
    };

    if (this.domOverlayRoot) {
      sessionOptions.domOverlay = { root: this.domOverlayRoot };
    }

    ARManager._inFlightSessionPromise = (async () => {
      try {
        const session = await navigator.xr.requestSession('immersive-ar', sessionOptions);
        ARManager._activeXRSession = session;
        return session;
      } finally {
        ARManager._inFlightSessionPromise = null;
      }
    })();

    return await ARManager._inFlightSessionPromise;
  }

  /**
   * Emits diagnostics snapshot to UI
   */
  emitDiagnostics() {
    if (this.onDiagnostics && !this._disposed) {
      this.onDiagnostics({ ...this.diagnostics });
    }
  }

  /**
   * Starts the WebXR immersive-ar session with strict concurrency and lifecycle guards
   */
  async startSession() {
    if (this._disposed) {
      console.warn('ARManager: Cannot start session on disposed instance.');
      return;
    }

    if (this.isSessionActive || this.isStarting) {
      console.warn('ARManager: Session already active or starting for this instance.');
      return;
    }
    this.isStarting = true;

    try {
      // 1. Verify support first
      const support = await ARManager.checkSupport();
      if (!support.supported) {
        throw new Error(support.reason);
      }

      if (this._disposed) return;

      // 2. Wait for any previous session termination to finish completely
      if (ARManager._activeEndingPromise) {
        try {
          await ARManager._activeEndingPromise;
        } catch {
          // ignore
        }
      }

      if (this._disposed) return;

      let session = null;

      // 3. Coordinate session acquisition with single-session enforcement
      if (ARManager._inFlightSessionPromise) {
        session = await ARManager._inFlightSessionPromise;
      } else if (ARManager._activeXRSession) {
        if (ARManager._activeManagerInstance && ARManager._activeManagerInstance !== this) {
          await ARManager.endAuthoritativeSession();
          session = await this._requestNewXRSession();
        } else {
          session = ARManager._activeXRSession;
        }
      } else {
        session = await this._requestNewXRSession();
      }

      if (this._disposed) {
        if (session && ARManager._activeXRSession === session) {
          await ARManager.endAuthoritativeSession();
        }
        return;
      }

      if (!session) {
        throw new Error('Failed to acquire valid WebXR immersive-ar session.');
      }

      this.xrSession = session;
      ARManager._activeXRSession = session;
      ARManager._activeManagerInstance = this;
      this.diagnostics.sessionActive = true;

      // 4. Setup Three.js scene & lights
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

      // Bright ambient light ensures entity materials are clearly visible against real camera
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
      this.scene.add(ambientLight);

      // Top directional light for 3D contour definition
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight.position.set(0.5, 3.5, 0.5);
      this.scene.add(dirLight);

      // Atmospheric horror rim light
      const horrorLight = new THREE.PointLight(0xff1122, 2.5, 10);
      horrorLight.position.set(0, 2.0, 0);
      this.scene.add(horrorLight);

      // 5. Setup Placement Reticle (decomposed transform, depthTest:false)
      this.reticle = new PlacementReticle();
      this.scene.add(this.reticle.root);

      // 6. Setup WebGL Renderer with alpha transparency for camera passthrough
      if (this.renderer) {
        try {
          this.renderer.setAnimationLoop(null);
          this.renderer.dispose();
        } catch {
          // ignore
        }
      }
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.xr.enabled = true;

      // Try local-floor so floor level matches Y=0, fallback to local
      try {
        this.renderer.xr.setReferenceSpaceType('local-floor');
      } catch {
        this.renderer.xr.setReferenceSpaceType('local');
      }

      if (this.canvasContainer) {
        this.canvasContainer.innerHTML = '';
        this.canvasContainer.appendChild(this.renderer.domElement);
      }

      await this.renderer.xr.setSession(session);

      // 7. Request viewer space & hit-test source
      this.viewerSpace = await session.requestReferenceSpace('viewer');
      this.hitTestSource = await session.requestHitTestSource({ space: this.viewerSpace });
      this.diagnostics.hitSourceReady = true;

      // 8. Attach session listeners safely
      session.removeEventListener('select', this.handleXRSelect);
      session.removeEventListener('end', this.handleXREnd);
      session.addEventListener('select', this.handleXRSelect);
      session.addEventListener('end', this.handleXREnd);

      this.isSessionActive = true;
      this.isStarting = false;
      this.diagnostics.loopRunning = true;
      this.emitDiagnostics();

      // 9. Start WebXR animation loop (guaranteed single loop)
      this.clock.start();
      this.renderer.setAnimationLoop((timestamp, frame) => this.onFrame(timestamp, frame));
    } catch (err) {
      console.error('ARManager: Initialization failure', err);
      this.isStarting = false;
      this.isSessionActive = false;
      this.diagnostics.lastError = err.message || 'Initialization failure';
      this.emitDiagnostics();

      ARManager._inFlightSessionPromise = null;
      if (this.xrSession && ARManager._activeXRSession === this.xrSession) {
        ARManager._activeXRSession = null;
      }
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
    if (!frame || !this.renderer || !this.isSessionActive) return;

    this.diagnostics.frameCount++;
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Always use the EXACT reference space that Three.js uses to position the XR camera
    const referenceSpace = this.renderer.xr.getReferenceSpace();

    // 1. Perform Hit-Testing
    if (this.hitTestSource && referenceSpace && this.reticle) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        if (pose) {
          this._tempMatrix.fromArray(pose.transform.matrix);
          this.reticle.updateFromMatrix(this._tempMatrix);

          if (!this.reticle.isVisible()) {
            this.reticle.setVisible(true);
            if (this.onSurfaceStateChange) this.onSurfaceStateChange(true);
          }

          // Cache authoritative latest hit pose
          const retPos = this.reticle.getPosition();
          this.latestHitPose.position.copy(retPos);
          this.latestHitPose.quaternion.copy(this.reticle.getQuaternion());
          this.latestHitPose.valid = true;

          this.diagnostics.hitCount++;
          this.diagnostics.surfaceDetected = true;
          this.diagnostics.lastPose = {
            x: retPos.x.toFixed(2),
            y: retPos.y.toFixed(2),
            z: retPos.z.toFixed(2),
          };
        }
      } else {
        if (this.reticle.isVisible()) {
          this.reticle.setVisible(false);
          if (this.onSurfaceStateChange) this.onSurfaceStateChange(false);
        }
        this.diagnostics.surfaceDetected = false;
      }
    }

    // 2. Update placed procedural entities & EncounterDirector using real XR camera pose
    const xrCamera = this.renderer.xr.getCamera();
    if (xrCamera) {
      xrCamera.getWorldPosition(this._tempCamPos);
      this.encounterDirector.update(elapsedTime, delta, this._tempCamPos);
      if (this.encounterDirector.currentDistance > 0) {
        this.diagnostics.distanceToEntity = this.encounterDirector.currentDistance.toFixed(2);
      }
    }

    // 3. Render scene
    this.renderer.render(this.scene, this.camera);

    // Throttle diagnostics emission to React (every 20 frames)
    if (this.diagnostics.frameCount % 20 === 0) {
      this.emitDiagnostics();
    }
  }

  /**
   * Handles user tapping the screen in XR space
   */
  handleXRSelect() {
    this.placeEntityAtCurrentReticle();
  }

  /**
   * Sets the active entity definition from the registry for subsequent placement
   */
  setSelectedEntity(entityDefOrId) {
    if (typeof entityDefOrId === 'string') {
      this.selectedEntityDef = getEntityById(entityDefOrId);
    } else if (entityDefOrId && entityDefOrId.createInstance) {
      this.selectedEntityDef = entityDefOrId;
    }
    this.diagnostics.selectedEntity = this.selectedEntityDef.name;
    this.emitDiagnostics();
  }

  /**
   * Explicitly places an entity at the reticle's current world-space pose
   */
  placeEntityAtCurrentReticle(overrideDef = null) {
    if (!this.reticle || !this.reticle.isVisible() || !this.latestHitPose.valid || !this.scene) {
      console.warn('ARManager: Surface not detected yet. Reticle is not locked onto a plane.');
      return { success: false, reason: 'NO_SURFACE_DETECTED' };
    }

    const entityDef = overrideDef || this.selectedEntityDef || getDefaultEntity();

    // Instantiate selected entity using its registry factory
    const entity = entityDef.createInstance({
      onStateChange: (newState, prevState) => {
        if (this.onEntityStateChange) {
          this.onEntityStateChange(newState, prevState, entity);
        }
      },
    });

    entity._definition = entityDef;

    // Position in world space directly from reticle's verified physical surface pose
    entity.root.position.copy(this.latestHitPose.position);

    // Face the real XR camera horizontally upon initial spawn (with distance check to prevent NaN)
    const xrCamera = this.renderer.xr.getCamera();
    if (xrCamera) {
      xrCamera.getWorldPosition(this._tempCamPos);
      const dx = this._tempCamPos.x - entity.root.position.x;
      const dz = this._tempCamPos.z - entity.root.position.z;
      if (dx * dx + dz * dz > 0.01) {
        entity.root.lookAt(this._tempCamPos.x, entity.root.position.y, this._tempCamPos.z);
      }
    }

    entity.root.updateMatrixWorld(true);
    this.scene.add(entity.root);
    this.placedEntities.push(entity);
    this.diagnostics.sceneEntityCount = this.placedEntities.length;
    this.emitDiagnostics();

    // Start Phase 4 Encounter State Machine
    this.encounterDirector.startEncounter(entity, entityDef);

    const pos = {
      x: entity.root.position.x.toFixed(2),
      y: entity.root.position.y.toFixed(2),
      z: entity.root.position.z.toFixed(2),
    };

    if (this.onEntityPlaced) {
      this.onEntityPlaced(this.placedEntities.length, pos, entity, entityDef);
    }

    return { success: true, count: this.placedEntities.length, position: pos, entity, entityDef };
  }

  /**
   * Scans the currently placed entity through EncounterDirector
   */
  scanPlacedEntities({ onProgress = null, onComplete = null, onFail = null } = {}) {
    if (this.placedEntities.length === 0) return null;
    const target = this.placedEntities[this.placedEntities.length - 1];
    const def = target._definition || this.selectedEntityDef || getDefaultEntity();

    const started = this.encounterDirector.startScan({ onProgress, onComplete, onFail });
    if (!started) return null;

    return {
      id: def.id,
      name: target.name || def.name,
      code: target.code || def.code,
      threat: target.threat || def.threat,
      resonance: target.resonance || def.resonance,
      behaviorSummary: def.behaviorSummary,
      scanDuration: def.scanDuration,
    };
  }

  /**
   * Cancels active scan
   */
  cancelScan(reason = 'USER_CANCELLED') {
    this.encounterDirector.cancelScan(reason);
  }

  /**
   * Dissolves and removes placed entities cleanly from AR scene via EncounterDirector
   */
  purgePlacedEntities(onComplete = null) {
    if (this.placedEntities.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    this.encounterDirector.escapeEncounter('USER_PURGE', () => {
      this.placedEntities = [];
      this.diagnostics.sceneEntityCount = 0;
      this.emitDiagnostics();
      if (onComplete) onComplete();
    });
  }

  /**
   * Handles WebXR session ending event fired by the browser
   */
  handleXREnd(event) {
    if (event && event.target && this.xrSession && event.target !== this.xrSession) {
      return;
    }

    if (this.xrSession && ARManager._activeXRSession === this.xrSession) {
      ARManager._activeXRSession = null;
    }
    if (ARManager._activeManagerInstance === this) {
      ARManager._activeManagerInstance = null;
    }

    this.diagnostics.sessionActive = false;
    this.diagnostics.loopRunning = false;
    this.emitDiagnostics();

    this.cleanup();

    if (this.onSessionEnded) {
      this.onSessionEnded();
    }
  }

  /**
   * Ends session gracefully and awaits termination
   */
  async endSession() {
    if (this.xrSession) {
      const session = this.xrSession;
      try {
        await session.end();
      } catch (err) {
        console.warn('ARManager: endSession error:', err);
      } finally {
        if (ARManager._activeXRSession === session) {
          ARManager._activeXRSession = null;
        }
        this.handleXREnd();
      }
    } else {
      this.handleXREnd();
    }
  }

  /**
   * Completely disposes all Three.js, WebXR, and DOM resources safely
   */
  cleanup() {
    this._disposed = true;
    this.isSessionActive = false;
    this.isStarting = false;
    this.diagnostics.sessionActive = false;
    this.diagnostics.loopRunning = false;

    if (this.encounterDirector) {
      this.encounterDirector.dispose();
    }

    if (this.renderer) {
      try {
        this.renderer.setAnimationLoop(null);
      } catch {
        // ignore
      }
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
      try {
        this.xrSession.removeEventListener('select', this.handleXRSelect);
        this.xrSession.removeEventListener('end', this.handleXREnd);
      } catch {
        // ignore
      }
      if (ARManager._activeManagerInstance === this) {
        ARManager._activeManagerInstance = null;
      }
      this.xrSession = null;
    }

    // Dispose reticle
    if (this.reticle) {
      try {
        this.reticle.dispose();
      } catch {
        // ignore
      }
      this.reticle = null;
    }

    // Dispose all placed entities
    for (let i = 0; i < this.placedEntities.length; i++) {
      try {
        this.placedEntities[i].dispose();
      } catch {
        // ignore
      }
    }
    this.placedEntities = [];
    this.diagnostics.sceneEntityCount = 0;

    // Dispose scene children
    if (this.scene) {
      try {
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
      } catch {
        // ignore
      }
      this.scene = null;
    }

    // Dispose renderer and remove canvas
    if (this.renderer) {
      try {
        this.renderer.dispose();
        if (this.canvasContainer && this.renderer.domElement) {
          if (this.canvasContainer.contains(this.renderer.domElement)) {
            this.canvasContainer.removeChild(this.renderer.domElement);
          }
        }
      } catch {
        // ignore
      }
      this.renderer = null;
    }
  }
}
