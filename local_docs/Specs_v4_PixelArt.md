# **Pixel Piano: v4 Pixel Art & Dynamism Specs**

**Status:** Draft / Research  
**Goal:** Transition from "Clean Vector UI" to "Dynamic Pixel Art" and fix geometric alignment issues.

## **1. Visual Alignment & Geometry**

### **1.1. Nameboard Reflections**
*   **Issue:** Current `repeating-linear-gradient` is an approximation that drifts out of alignment with specific key groups (B-C, E-F gaps).
*   **Fix:** Reflections must be **Grid-Deterministic**.
    *   Instead of a global overlay, the Reflection should be rendered as a specific SVG or Canvas layer that uses the exact `NOTE_OFFSETS` from `geometry.ts`.
    *   **Pixel Art Style:** The reflection should not be a "gradient fade". It should be a dithered pattern or a semi-transparent block of pixels exactly 24px wide, directly above each white key.
    *   **Artifacts:** Remove the white line artifact between the nameboard and waterfall (likely a sub-pixel rendering or border leakage issue).

### **1.2. The "Static Pocket" Rule (Fixing the Pivot)**
*   **Issue:** Currently, pressing a white key translates the whole SVG `North`. This moves the "cutout" well, making it look like the white key is sliding into the black key.
*   **Refined Physics (Pixel Logic):**
    *   **No X/Y Translation of the Container:** The footprint of the key must remain absolute static to preserve the grid.
    *   **Internal Animation:** "Depth" is conveyed by shifting the *Top Face* pixels south (down) within the container, or simply by reducing the "Front Lip" height.
    *   **The visual result:** The key gets "shorter" (South edge moves North) or "darker", but the North cutouts defining the black key pockets **must never move**.

## **2. Waterfall Dynamism**

### **2.1. Flow Continuity**
*   **Concept:** The falling note shouldn't just "trigger a light" when it hits the key. It should feel like physical "water" or "light" pouring *onto* and *over* the key.
*   **Behavior:**
    *   The waterfall block falls -> Hits Key Top -> **Continues scrolling down the key surface**.
    *   This creates a continuous visual stream from top of screen to bottom of key.
*   **Implementation Constraint:** The flow on the key must be masked strictly to the key's irregular shape (including cuts).

## **3. Pixel Art Aesthetic Overhaul**

### **3.1. Strict "No Blur" Rule**
*   **Shadows:** Eliminate all `box-shadow` blur radii.
    *   *Bad:* `box-shadow: 0 4px 6px rgba(0,0,0,0.5)`
    *   *Good:* `box-shadow: 0 4px 0px rgba(0,0,0,0.5)` (Hard Cast Shadow)
*   **Gradients:** Replace smooth `linear-gradient` with **Dithering** or **Banding**.
    *   Use CSS `repeating-linear-gradient` with hard stops for banding effects.
    *   Use SVG patterns for dithering (checkerboards) to simulate lower opacity shadows.

### **3.2. Outlines & Borders**
*   **Global Outline:** Every distinct object (Key, Cheek Block) needs a 1px or 2px distinct border.
*   **Contrast:** "Void" areas should be pure black (or darkest palette color). Edges touching the void need high-contrast outlines (e.g., almost white highlight on top edges, dark distinct line on bottom edges).

### **3.3. Palette**
*   Define a strict 16 or 32-color palette.
*   All colors in the app must map to this palette (no random `opacity-50` blends creating new hex values, unless simulating CRT scanlines).

## **4. Implementation Roadmap**

1.  **Geometry Fix:** Refactor `Key` component to support "Internal Depress" animation (moving inner face vs moving container).
2.  **Reflection System:** Build a `NameboardReflection` component that maps `keysData` to generate exact reflection blocks.
3.  **Style Migration:** Strip `globals.css` of smooth blurs. Introduce pixel-border utilities.
4.  **Waterfall Upgrade:** Experiment with `mask-image` on Keys to allow passing "flow" elements to be visible on the key face.
