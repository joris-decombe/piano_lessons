# **Pixel Piano: v4.1 Visual Polish Specs**

**Status:** Implementation  
**Base:** Specs v4 Pixel Art  
**Context:** Refinement of the V4 implementation based on visual feedback.

## **1. Visual Correction Tasks**

### **1.1. Key Reflections (Alignment)**
*   **Problem:** Reflections need to correspond 1:1 with white keys.
*   **Spec:** Continue using `<NameboardReflections />` but refine the style:
    *   **Style:** Use a hard-edged or slightly dithered block directly above the key.
    *   **Opacity:** `0.1` (Idle), `0.05` (Active).
    *   **Alignment:** Ensure strict `left/width` inheritance from `keysData`.

### **1.2. Shadow Tuning (Pixel Precision)**
*   **White Key Internal Shadows:**
    *   **Current:** `3px` wide (Too soft/wide).
    *   **New Spec:** Reduce to **1px** or **2px** hard band.
    *   *Logic:* `inset 1px 0 0 0 color`.
*   **Black Key Ambient Occlusion (AO):**
    *   **Current:** Hard bands exist but might be invisible.
    *   **New Spec:** Ensure `z-index` allows visibility. Use `opacity-40` dark band.
    *   **Width:** `2px` (Idle), `1px` (Active).

### **1.3. Case Alignment**
*   **Problem:** Cheek blocks and Key Slip alignment.
*   **Spec:**
    *   Verify Cheek Block height matches Key Slip top edge.
    *   Ensure Border widths (`12px` vs `2px`) create a coherent "Furniture Frame".

## **2. Waterfall Enhancements**

### **2.1. Particle Texture**
*   **Concept:** Notes should look like "energy" or "liquid", not plastic blocks.
*   **Spec:** Apply a CSS pattern to note blocks.
    *   *Pattern:* `radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)` size `4px 4px`.
    *   This adds a subtle "dot matrix" or "bubble" texture.

### **2.2. The "Crash" (Impact)**
*   **Event:** Note `tick === currentTick`.
*   **Visual:** A distinct horizontal "Splash" bar at `bottom: 0` of the Waterfall area (just above keys).
    *   **Color:** Brighter version of note color (or White).
    *   **Animation:** Quick fade-out (100ms).

### **2.3. Key "Flow" Overlay**
*   **Context:** Connecting the waterfall to the key.
*   **Spec:** Inside `Key.tsx`, when `isActive` is true:
    *   Render a child `div` **on top** of the Key Face.
    *   **Texture:** Same "Particle/Stream" texture as the waterfall note.
    *   **Animation:** Optional vertical scroll (`background-position-y`).
    *   **Goal:** The key looks like it's being "washed" by the note color.

## **3. Screen Ratio**
*   **Observation:** Waterfall might be too short or keys too tall.
*   **Action:** Review vertical flex allocation in `layout.tsx` or `page.tsx`. Ensure Waterfall gets dominant space (e.g., `flex-grow`).
