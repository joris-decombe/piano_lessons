# Visual Tasks v4 (Pixel Polish)

**Source:** User feedback & Screenshot analysis (clipboard-1769222328943.png)
**Status:** Planning

## 1. Visual Fixes

### 1.1. Key Reflections
*   **Issue:** Reflections on the nameboard do not align perfectly or look stylistically incorrect.
*   **Goal:** Ensure 1:1 horizontal alignment with white keys and refine opacity/gradient style.

### 1.2. Case Alignment
*   **Issue:** Cheek blocks and key slip alignment appears "off" (misaligned heights or widths).
*   **Goal:** Verify `Keyboard.tsx` flex layout and border widths to ensure a solid, gap-free furniture frame.

### 1.3. Shadow Tuning
*   **Issue (White Keys):** Internal shadows on pressed keys are "too wide".
*   **Issue (Black Keys):** Shadows cast by black keys are missing or invisible.
*   **Goal:** Reduce white key inner shadow width (3px -> 1px/2px). Debug Black Key AO visibility (z-index or opacity).

## 2. Waterfall Enhancements

### 2.1. Texture (Particles)
*   **Goal:** Add a "particle effect" or dithering texture to the falling notes so they aren't flat colored rectangles.

### 2.2. "Crashing" Effect
*   **Goal:** Visual impact when a note hits the nameboard/keys (splash or flash).

### 2.3. Key Overlay (Flow)
*   **Goal:** Implement the v4 spec where the note color flows *onto* the key surface (masked overlay).

### 2.4. Screen Ratio
*   **Goal:** Review the vertical height distribution between the Waterfall and the Keyboard.
