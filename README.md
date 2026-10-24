# VEIL — Reality Scanner

**VEIL** is a mobile-first web horror prototype. The device optical sensor is tuned to fictional phase-shifted electromagnetic frequencies, revealing shadowy entities coexisting within our space that are imperceptible to biological vision.

---

## 🖲 Features

- **Mobile-First Full-Screen Scanner**:
  - Live rear-facing camera access (`facingMode: { ideal: "environment" }`).
  - Full-screen tactical HUD with CRT scanlines, chromatic aberration, reticle lock, and telemetry.
- **Simulated Chamber Fallback**:
  - If camera permissions are denied or running on desktop devices without a camera, the app seamlessly falls back to a simulated night-vision laboratory surveillance feed.
- **Dynamic Horror Manifestations**:
  - Transparent spectral entities blended over the camera feed (`screen` blend mode with radial feathering).
  - Jitter, breathing, flickering, and twitch animations.
  - Tactical tracking HUD locking onto the coordinates of the manifestation with threat classification and distance readouts.
- **Atmospheric Audio Engine**:
  - Synthesized Web Audio API sound effects (sub-bass drops, analog static bursts, radar pings, Geiger clicks) with zero external audio assets needed.
- **Game Loop & Reality Integrity**:
  - Random recurring anomaly manifestations.
  - Manual **"SCAN / PULSE SENSOR"** button for instant demonstration.
  - Decreasing **Reality Integrity** upon entity loss, with emergency warnings and a **Purge / Recalibrate** stabilization protocol.

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start Vite dev server (accessible locally and on your local Wi-Fi network)
npm run dev
```

Open `http://localhost:5173/` in your browser.

To test on your mobile phone on the same Wi-Fi, open the Network URL printed in the terminal (e.g. `http://<your-local-ip>:5173/`).

---

## 🛠 Technology Stack
- **React 19**
- **Vite 6**
- **Vanilla CSS** (Analog CRT, scanlines, SVG reticles, CSS keyframe glitch shaders)
- **Web Audio API** (Procedural horror audio synthesis)
