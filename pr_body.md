## Description

This PR implements a comprehensive visual overhaul of the application, transitioning to a cohesive "Pixel Art" aesthetic (Satie-16 Palette), refining the rendering geometry, and optimizing performance for modern devices.

### 🎨 Visual Overhaul (v4 & v5)
*   **Pixel Art Engine:** Implemented a strict pixel-grid system with "Face-Shift" mechanics for key animations.
*   **Satie-16 Palette:** Standardized color variables (`--color-pal-*`) for consistent theming across keys, waterfall, and UI.
*   **Layering & Reflections:** Completely rewrote the z-index stacking context to support realistic key reflections, nameboard overlay, and waterfall interleaving.
*   **Geometry Refinements:** Fixed cheek block gaps, chamfered key wells, and shadow leakage.

### 📱 Device & Performance Optimization
*   **Dynamic Waterfall Speed:** Implemented a `ResizeObserver` to calculate `lookAheadTime` based on screen height. This ensures a consistent "pixels per second" flow, preventing crushed notes on iPhones and capitalizing on vertical space on iPads/Desktops.
*   **Safe Area Support:** Added `env(safe-area-inset-*)` support for notch/home-indicator compatibility on iOS landscape mode.
*   **Touch UX:** Disabled `overscroll-behavior` to prevent "rubber-banding" on mobile devices.

### 📚 Documentation
*   **Specs Finalization:** Consolidated fragmented drafts into `docs/Pixel_Piano_Specs_v1.0.md`.
*   **New Guides:** Added `docs/Pixel_Art_Techniques.md` detailing the dithering and geometry techniques used.
*   **Cleanup:** Moved active documentation to `docs/` and archived legacy files.

### 🧪 Testing & Quality
*   **E2E Tests:** Updated Playwright tests to align with the new visual structure and removed brittle visual snapshots.
*   **Code Quality:** Cleaned up lint warnings and optimized React hook dependencies in the audio/visual loop.

## Type of change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [x] New feature (non-breaking change which adds functionality)
- [x] Refactoring (no functional changes, no api changes)
- [x] Documentation update

## How Has This Been Tested?

- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] Manual verification on **iPhone (Landscape)**: Verified safe areas and waterfall scaling.
- [x] Manual verification on **Desktop**: Verified high-resolution rendering and reflection layering.
- [x] Automated E2E tests passing.

## Checklist:

- [x] My code follows the style guidelines of this project
- [x] I have performed a self-review of my own code
- [x] I have made corresponding changes to the documentation
- [x] My changes generate no new warnings