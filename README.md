# VEIL — Reality Scanner

**VEIL** is a mobile-first web horror experience. The device optical sensor is tuned to fictional phase-shifted electromagnetic frequencies, revealing shadowy entities coexisting within physical space that are imperceptible to biological vision.

---

## 📱 Development & Testing Policy

> [!IMPORTANT]
> **Target Hardware**: An **Android phone with ARCore support running Chrome** is the sole target device for camera access, WebXR immersive-ar, hit-testing, world-space surface tracking, and 3D AR placement.
>
> **Development Machine (Laptop)**: Used exclusively for source-code editing, static analysis, dependencies, and production builds (`npm run build`). Desktop browsers lack ARCore hardware; an unsupported WebXR status on a desktop is expected behavior and is not a project failure.

---

## 🖲 Features

- **Real-World Tracked AR (WebXR + Three.js)**:
  - Surface plane hit-testing using WebXR Device API (`immersive-ar`).
  - World-anchored placement: Entities stay firmly pinned to physical room coordinates as the user moves.
  - Reticle locking indicator when horizontal or vertical planes are detected.
  - Production-quality horror entity (**THE WATCHER**) with discrete state machine (`IDLE`, `OBSERVING`, `DISTURBED`, `DISAPPEARING`, `INACTIVE`), bounded head tracking toward viewer, pale cyan eye glow, dynamic point light, and 65 drifting shadow void particles.
  - Active scanning mechanics with debounced progress gauge, classification readout (`VOID-012 // CLASS V`), and single-encounter logging.
- **Mobile-First Optical Scanner**:
  - Live rear-facing camera access (`facingMode: { ideal: "environment" }`).
  - Tactical HUD with CRT scanlines, chromatic glitch overlays, reticle lock, and telemetry.
- **Simulated Chamber Fallback**:
  - Useful fallback view for desktop testing without substituting a fake 2D overlay for real AR.
- **Synthesized Audio Engine**:
  - Web Audio API procedural sound effects (sub-bass drone, Geiger clicks, radar pings) requiring zero external audio assets.

---

## 🚀 Deployment to Vercel

Because mobile browsers mandate a **Secure Context (HTTPS)** for both camera permissions (`getUserMedia`) and WebXR (`immersive-ar`), test builds must be accessed over HTTPS.

### Option 1: Automatic Deployment via GitHub (Recommended)
1. Commit and push your changes to your GitHub repository:
   ```bash
   git push origin main
   ```
2. Link your GitHub repository (`Govindan007/monster-scanner`) to your [Vercel Dashboard](https://vercel.com/new).
3. Vercel automatically detects the Vite framework and builds with `npm run build` and output directory `dist`.
4. Once deployed, open the assigned `https://<your-project>.vercel.app` URL on your Android phone in Chrome.

### Option 2: Direct CLI Deployment
```bash
# Install Vercel CLI globally if not already installed
npm install -g vercel

# Deploy production build
vercel --prod
```

---

## 🧪 Testing on Android Phone

1. Open **Chrome** on your ARCore-supported Android phone.
2. Navigate to your deployed HTTPS Vercel URL (e.g. `https://monster-scanner.vercel.app`).
3. Tap **START SCAN** and grant camera permissions when prompted.
4. Tap the **⚡ ENTER REAL AR** button on the tactical HUD.
5. Grant WebXR permission (*"Allow this site to create a 3D map of your surroundings"*).
6. Slowly move your phone over a textured floor or tabletop until the **red reticle ring** aligns with the physical surface.
7. Tap the screen or press **MANIFEST THE WATCHER** to lock the entity to physical coordinates.
8. Walk around the entity in your room to verify world tracking.
9. Press **SCAN / PULSE ENTITY** to initiate signal analysis and trigger the disturbed reaction.
10. Press **DISPERSE ENTITY** or **EXIT AR** to cleanly dissolve the entity and return to the scanner.

---

## 💻 Desktop Local Development

```bash
# Install dependencies
npm install

# Run static checks
npm run lint

# Production build validation
npm run build

# Start local dev server
npm run dev
```

*Note: On desktop, clicking "ENTER REAL AR" displays a hardware notice explaining that ARCore is required, with an option to continue using the optical scanner.*
