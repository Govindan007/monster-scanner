import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { soundEffects } from '../services/soundEffects';

/**
 * Procedural Creepy 3D Humanoid Entity for Real-World Tracked WebXR
 * Tall, unnaturally thin shadow silhouette with elongated limbs,
 * featureless dark face, and glowing pale eyes.
 * Built entirely from procedural Three.js geometries - ZERO external downloads.
 */
function createCreepy3DHumanoid() {
  const entityGroup = new THREE.Group();
  entityGroup.name = 'HorrorEntity';

  // Materials
  const shadowMaterial = new THREE.MeshStandardMaterial({
    color: 0x05070a,
    roughness: 0.85,
    metalness: 0.1,
  });

  const eyeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  const auraMaterial = new THREE.MeshBasicMaterial({
    color: 0xff2222,
    transparent: true,
    opacity: 0.25,
    wireframe: true,
  });

  // 1. Elongated Lower Body / Tapered Legs (Vaporous column)
  const lowerGeo = new THREE.CylinderGeometry(0.08, 0.02, 1.1, 8);
  const lowerBody = new THREE.Mesh(lowerGeo, shadowMaterial);
  lowerBody.position.y = 0.55;
  entityGroup.add(lowerBody);

  // 2. Emaciated Torso (tapered)
  const torsoGeo = new THREE.ConeGeometry(0.16, 0.7, 8);
  const torso = new THREE.Mesh(torsoGeo, shadowMaterial);
  torso.rotation.x = Math.PI; // upside-down cone for broad shoulder tapering to thin waist
  torso.position.y = 1.35;
  entityGroup.add(torso);

  // Rib cage subtle aura
  const ribAuraGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.45, 6);
  const ribAura = new THREE.Mesh(ribAuraGeo, auraMaterial);
  ribAura.position.y = 1.35;
  entityGroup.add(ribAura);

  // 3. Unnaturally Long Neck
  const neckGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.28, 8);
  const neck = new THREE.Mesh(neckGeo, shadowMaterial);
  neck.position.y = 1.76;
  entityGroup.add(neck);

  // 4. Distorted Elongated Head (Featureless dark face)
  const headGeo = new THREE.SphereGeometry(0.11, 16, 16);
  headGeo.scale(0.85, 1.45, 0.95);
  const head = new THREE.Mesh(headGeo, shadowMaterial);
  head.position.y = 1.95;
  entityGroup.add(head);

  // 5. Faint Pale Glowing Eyes (asymmetric pinpoints)
  const leftEyeGeo = new THREE.SphereGeometry(0.016, 8, 8);
  const leftEye = new THREE.Mesh(leftEyeGeo, eyeMaterial);
  leftEye.position.set(-0.038, 1.96, 0.09);
  entityGroup.add(leftEye);

  const rightEyeGeo = new THREE.SphereGeometry(0.014, 8, 8);
  const rightEye = new THREE.Mesh(rightEyeGeo, eyeMaterial);
  rightEye.position.set(0.036, 1.98, 0.09);
  entityGroup.add(rightEye);

  // Eye glow point lights
  const eyeLight = new THREE.PointLight(0xff4444, 1.5, 1.5);
  eyeLight.position.set(0, 1.97, 0.15);
  entityGroup.add(eyeLight);

  // 6. Left Elongated Arm & Fingers (drapes past knees)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.19, 1.6, 0);

  const armGeo = new THREE.CylinderGeometry(0.022, 0.014, 1.15, 6);
  const leftArm = new THREE.Mesh(armGeo, shadowMaterial);
  leftArm.position.y = -0.55;
  leftArm.rotation.z = 0.08;
  leftArmGroup.add(leftArm);

  // Spindly claw fingers
  for (let i = -1; i <= 1; i++) {
    const fingerGeo = new THREE.CylinderGeometry(0.005, 0.002, 0.22, 4);
    const finger = new THREE.Mesh(fingerGeo, shadowMaterial);
    finger.position.set(i * 0.015, -1.18, 0);
    finger.rotation.z = i * 0.15;
    leftArmGroup.add(finger);
  }
  entityGroup.add(leftArmGroup);

  // 7. Right Elongated Arm & Fingers
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.19, 1.6, 0);

  const rightArm = new THREE.Mesh(armGeo, shadowMaterial);
  rightArm.position.y = -0.55;
  rightArm.rotation.z = -0.08;
  rightArmGroup.add(rightArm);

  for (let i = -1; i <= 1; i++) {
    const fingerGeo = new THREE.CylinderGeometry(0.005, 0.002, 0.22, 4);
    const finger = new THREE.Mesh(fingerGeo, shadowMaterial);
    finger.position.set(i * 0.015, -1.18, 0);
    finger.rotation.z = -i * 0.15;
    rightArmGroup.add(finger);
  }
  entityGroup.add(rightArmGroup);

  // Store references for micro-animation
  entityGroup.userData = {
    leftArm: leftArmGroup,
    rightArm: rightArmGroup,
    head: head,
    eyeLight: eyeLight,
    ribAura: ribAura,
    baseY: 0,
  };

  return entityGroup;
}

/**
 * Procedural Surface Placement Reticle
 */
function createPlacementReticle() {
  const reticle = new THREE.Group();
  reticle.name = 'PlacementReticle';
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;

  // Outer red/cyan ring
  const ringGeo = new THREE.RingGeometry(0.18, 0.22, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff2a2a,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  reticle.add(ring);

  // Inner pulsing target center
  const innerGeo = new THREE.CircleGeometry(0.04, 16);
  innerGeo.rotateX(-Math.PI / 2);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    side: THREE.DoubleSide,
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  reticle.add(inner);

  // 4 Tactical corner crosshair ticks
  const tickMat = new THREE.LineBasicMaterial({ color: 0xff2a2a, linewidth: 2 });
  const points = [];
  points.push(new THREE.Vector3(-0.3, 0, 0), new THREE.Vector3(-0.24, 0, 0));
  points.push(new THREE.Vector3(0.24, 0, 0), new THREE.Vector3(0.3, 0, 0));
  points.push(new THREE.Vector3(0, 0, -0.3), new THREE.Vector3(0, 0, -0.24));
  points.push(new THREE.Vector3(0, 0, 0.24), new THREE.Vector3(0, 0, 0.3));

  const tickGeo = new THREE.BufferGeometry().setFromPoints(points);
  const ticks = new THREE.LineSegments(tickGeo, tickMat);
  reticle.add(ticks);

  return reticle;
}

export default function RealWorldAR({ onExitAR, onEntityPlaced }) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);

  const [arStatus, setArStatus] = useState('SCANNING_SURFACE');
  const [placedEntityCount, setPlacedEntityCount] = useState(0);
  const [planeDetected, setPlaneDetected] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const cleanupRef = useRef(null);

  const handleEndSession = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    onExitAR();
  }, [onExitAR]);

  useEffect(() => {
    let isMounted = true;
    let xrSession = null;
    let hitTestSource = null;
    let localSpace = null;
    let placedEntity = null;

    async function initWebXR() {
      if (!navigator.xr) {
        setErrorMessage('WebXR API is not available in this browser.');
        return;
      }

      const isSupported = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
      if (!isSupported) {
        setErrorMessage(
          'WebXR immersive-ar mode is not supported on this device/browser. Real-world AR requires ARCore on Android Chrome or an AR headset.'
        );
        return;
      }

      try {
        // Request WebXR session with hit-test and DOM overlay
        const sessionOptions = {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['local-floor', 'anchors', 'dom-overlay'],
        };

        if (overlayRef.current) {
          sessionOptions.domOverlay = { root: overlayRef.current };
        }

        xrSession = await navigator.xr.requestSession('immersive-ar', sessionOptions);
        if (!isMounted) {
          xrSession.end();
          return;
        }

        // Three.js Scene Setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

        // Ambient & Directional Lighting for atmospheric shadows
        const ambientLight = new THREE.AmbientLight(0x222222, 1.2);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(0.5, 2, 0.5);
        scene.add(dirLight);

        const redHorrorLight = new THREE.PointLight(0xff2a2a, 2.5, 6);
        redHorrorLight.position.set(0, 1.5, 0);
        scene.add(redHorrorLight);

        // Placement Reticle
        const reticle = createPlacementReticle();
        scene.add(reticle);

        // WebGL Renderer with XR enabled
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        renderer.xr.setReferenceSpaceType('local');

        if (containerRef.current) {
          containerRef.current.appendChild(renderer.domElement);
        }

        await renderer.xr.setSession(xrSession);

        // Reference Spaces
        const viewerSpace = await xrSession.requestReferenceSpace('viewer');
        localSpace = await xrSession
          .requestReferenceSpace('local-floor')
          .catch(() => xrSession.requestReferenceSpace('local'));

        // Hit Test Source
        hitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });

        // Handle Tap/Select: Place Entity on surface
        const onSelect = () => {
          if (!reticle.visible) return;

          // Sound effect
          soundEffects.playAnomalySpawn();

          if (!placedEntity) {
            placedEntity = createCreepy3DHumanoid();
            scene.add(placedEntity);
          }

          // Anchor at detected reticle position
          placedEntity.position.setFromMatrixPosition(reticle.matrix);

          // Face the camera on the horizontal plane
          const camPos = new THREE.Vector3();
          camera.getWorldPosition(camPos);
          placedEntity.lookAt(camPos.x, placedEntity.position.y, camPos.z);

          setPlacedEntityCount((prev) => prev + 1);
          setArStatus('ENTITY_LOCKED_IN_SPACE');
          if (onEntityPlaced) onEntityPlaced();

          // Hide reticle once placed (user can tap again to reposition)
          reticle.visible = false;
        };

        xrSession.addEventListener('select', onSelect);

        // Handle XR session termination
        xrSession.addEventListener('end', () => {
          handleEndSession();
        });

        // Animation Loop
        let clock = new THREE.Clock();

        renderer.setAnimationLoop((timestamp, frame) => {
          if (!frame) return;

          const elapsedTime = clock.getElapsedTime();

          // Hit Testing when entity is not placed or to locate surfaces
          if (hitTestSource && (!placedEntity || arStatus === 'SCANNING_SURFACE')) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
              const hit = hitTestResults[0];
              const pose = hit.getPose(localSpace);
              if (pose) {
                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
                setPlaneDetected(true);
                setArStatus((prev) => (prev === 'ENTITY_LOCKED_IN_SPACE' ? prev : 'SURFACE_READY'));
              }
            } else {
              reticle.visible = false;
              setPlaneDetected(false);
            }
          }

          // Subtle Entity Animation (breathing, arm twitches, eye light oscillation)
          if (placedEntity) {
            const { leftArm, rightArm, head, eyeLight, ribAura } = placedEntity.userData;

            // Breathing vertical float
            placedEntity.position.y += Math.sin(elapsedTime * 2.5) * 0.0004;

            // Creepy subtle arm sway
            if (leftArm && rightArm) {
              leftArm.rotation.x = Math.sin(elapsedTime * 1.8) * 0.06;
              rightArm.rotation.x = -Math.sin(elapsedTime * 1.8) * 0.06;
            }

            // Head micro-jitter
            if (head) {
              head.rotation.y = Math.sin(elapsedTime * 0.8) * 0.08;
              head.rotation.z = Math.cos(elapsedTime * 1.4) * 0.04;
            }

            // Pulsing eye intensity
            if (eyeLight) {
              eyeLight.intensity = 1.2 + Math.sin(elapsedTime * 4.0) * 0.8;
            }

            // Wireframe rib cage aura
            if (ribAura) {
              ribAura.rotation.y += 0.01;
            }
          }

          renderer.render(scene, camera);
        });

        // Set cleanup handler
        cleanupRef.current = () => {
          renderer.setAnimationLoop(null);
          if (hitTestSource) {
            hitTestSource.cancel?.();
          }
          if (xrSession) {
            xrSession.end().catch(() => {});
          }
          scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach((m) => m.dispose());
              } else {
                obj.material.dispose();
              }
            }
          });
          renderer.dispose();
          if (containerRef.current && renderer.domElement) {
            containerRef.current.removeChild(renderer.domElement);
          }
        };
      } catch (err) {
        console.error('Failed to start WebXR session:', err);
        setErrorMessage(`WebXR Error: ${err.message || 'Could not initialize immersive-ar session.'}`);
      }
    }

    initWebXR();

    return () => {
      isMounted = false;
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [handleEndSession, onEntityPlaced]);

  return (
    <div className="real-world-ar-container">
      {/* Three.js WebXR Render Canvas Container */}
      <div ref={containerRef} className="webxr-canvas-holder" />

      {/* WebXR DOM Overlay for Horror HUD & Controls */}
      <div ref={overlayRef} className="webxr-dom-overlay">
        {/* Top AR Header */}
        <div className="ar-hud-header">
          <div className="ar-hud-badge">
            <span className="ar-pulse-dot"></span>
            <span>VEIL // REAL WORLD AR</span>
          </div>
          <button className="ar-exit-button" onClick={handleEndSession}>
            ✕ EXIT AR
          </button>
        </div>

        {/* Central Guidance Message */}
        <div className="ar-guidance-container">
          {errorMessage ? (
            <div className="ar-error-card">
              <div className="ar-error-title">⚠ AR INITIALIZATION FAILED</div>
              <p className="ar-error-body">{errorMessage}</p>
              <button className="cyber-button-sm primary" onClick={handleEndSession}>
                RETURN TO CAMERA SCANNER
              </button>
            </div>
          ) : (
            <div className="ar-status-banner">
              {arStatus === 'SCANNING_SURFACE' && (
                <span>POINT CAMERA SLOWLY TOWARD FLOOR OR TABLE...</span>
              )}
              {arStatus === 'SURFACE_READY' && (
                <span className="ar-blink-text">SURFACE DETECTED // TAP SCREEN TO ANCHOR ENTITY</span>
              )}
              {arStatus === 'ENTITY_LOCKED_IN_SPACE' && (
                <span className="ar-locked-text">
                  ENTITY ANCHORED IN REAL SPACE // WALK AROUND IT
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom AR Telemetry */}
        {!errorMessage && (
          <div className="ar-bottom-telemetry">
            <div className="ar-telemetry-row">
              <span className="ar-dim">TRACKING:</span>
              <span className="ar-highlight">
                {planeDetected ? 'SURFACE LOCKED' : 'SEARCHING PLANE'}
              </span>
            </div>
            <div className="ar-telemetry-row">
              <span className="ar-dim">ENTITY:</span>
              <span className="ar-highlight">
                {placedEntityCount > 0 ? 'THE TALL LURKER (ANCHORED)' : 'UNASSIGNED'}
              </span>
            </div>
            <div className="ar-instructions">
              {placedEntityCount > 0
                ? 'The entity remains pinned to this exact physical location as you move.'
                : 'Tap anywhere on the surface reticle to manifest the entity into your physical room.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
