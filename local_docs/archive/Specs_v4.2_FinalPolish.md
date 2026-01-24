# **Pixel Piano: v4.3 Final Polish Specs**

**Status:** Implementation  
**Base:** Specs v4.2  
**Context:** Corrections based on particle/splash feedback.

## **1. Waterfall Aesthetics**

### **1.1. Waterfall Overlap (The "Crash")**
*   **Problem:** Gaps visible between waterfall notes and keys (especially Black Keys with `top: 2px`).
*   **Fix:** Waterfall notes must **overshoot** the landing zone.
    *   `bottom: calc(Y% - 4px)`
    *   `height: calc(H% + 4px)`
    *   This ensures the note tucks behind the Nameboard lip or visually connects with the key top.

### **1.2. Falling Notes (Texture)**
*   **Concept:** Particles are not "on" the notes. They are "in the air" behind the notes.
*   **Implementation:**
    *   A static or slowly drifting `ParticlesLayer` behind the `visibleNotes`.
    *   **Appearance:** Sparse, semi-transparent white pixels (`opacity-20`) drifting downwards or static dither pattern.
    *   **Notes:** Falling notes render *on top* of these particles.

### **1.2. Falling Notes (Texture)**
*   **Refinement:** Remove the heavy radial gradient "dots" from the note body if it looks like noise. Keep notes relatively clean but maybe semi-transparent (`opacity-90`) so particles behind show through slightly?
    *   *User said:* "seen in transparency behind the notes".
    *   **Action:** Reduce Note Opacity to `0.8` or `0.9` to reveal the particle layer behind.

### **1.3. The "Splash" (Connection)**
*   **Refinement:** The splash shouldn't be a jarring bar. It should be a "Foam Line" at the bottom of the waterfall (Z-index above keys, below note).
*   **Style:** `2px` height, white, oscillating opacity (shimmer).

## **2. Key Flow (The "Wash")**

### **2.1. Scrolling Texture**
*   **Problem:** The current key overlay is static.
*   **Fix:** Animate the `background-position-y` of the `Key` overlay.
*   **Animation:** `linear infinite` scroll downwards. Speed matches waterfall speed (approx).
*   **Texture:** Use vertical "streaks" (`linear-gradient`) rather than dots to simulate water flowing over a surface.

## **3. Case Alignment (Furniture)**

### **3.1. Cheek Blocks vs Key Slip**
*   **Issue:** Cheek Blocks have `border-b-[12px]`. Key Slip has `border-t-[2px]`.
*   **Visual:** The Cheek Block "Front Face" (12px) is much deeper than the Key Slip's "Top Lip" (2px).
*   **Fix:**
    *   Either increase Key Slip border to `12px` (making a heavy front rail).
    *   OR (Better): Align the **Bottom** of the Cheek Block border with the **Bottom** of the Key Slip border?
    *   **Design Decision:** The Cheek Block is a 3D block. The Key Slip is a board connecting them. They should align flush at the "South" face.
    *   **Action:** Ensure the `flex` container allows them to sit flush. Check `h-[154px]` logic.

## **4. Screen Ratio**
*   **Action:** Check `main.py` or layout files. Waterfall should ideally take ~60-70% of vertical space, Keys ~30%.
