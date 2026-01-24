# **Pixel Piano: v5 Pixel Art & Continuous Flow Specs**

**Status:** Research Complete  
**Version:** 5.0  
**Goal:** Real-time mirrored reflections and synchronized waterfall-to-key animation.

## **1. Architecture: The "Underlay" Flow**

### **1.1. The "Note is the Key" Paradigm**
*   **Concept:** The Waterfall Note **IS** the Active Key Face.
*   **Z-Index Stack (Bottom to Top):**
    1.  **Key Bed (z-0):** Black void `bg-black`.
    2.  **Waterfall Notes (z-10):** Flowing rects. **Slightly transparent (`opacity: 0.8`)** to suggest energy/light rather than solid plastic.
    3.  **Key Frame (z-20):** 
        *   **Inactive:** Opaque Face (`bg-white` / `bg-black`) covering the bed.
        *   **Active:** Transparent Face (revealing the Note at z-10). Renders Borders/Shadows only.
    4.  **Nameboard (z-30):** Opaque Container. Covers the waterfall source.
    5.  **Cheek Blocks (z-30):** Opaque. Covers the sides.

### **1.2. Implementation Details**
*   **Waterfall:** Extends to `bottom: 0px`.
*   **Key Component:** 
    *   Logic inverted: `isActive` -> `opacity-0` for the face background (but keep borders).

## **2. Mirrored Reflections (2.5D)**

### **2.1. The Vertical Mirror**
*   **Visual:** The nameboard is a vertical glossy surface.
*   **Technique:** **Duplicate & Flip**.
*   **Implementation:**
    *   Inside `Nameboard` container.
    *   Render a clone of **Active Waterfall Notes** (not keys).
    *   **Transform:** `scaleY(-1)`.
    *   **Opacity:** `0.3` (Alpha Blending).
    *   **Mask:** Gradient mask (fade out upward).
    *   **Dimensions:** Fixed height (e.g., `12px` or `16px`) to simulate perspective compression.

## **3. Pixel Art Transparency**

### **3.1. Glossy vs. Matte**
*   **Reflections:** Use **Alpha Blending** (`opacity-30` + `mix-blend-mode: screen` or normal) to simulate Gloss/Glass. Dithering is too noisy for this specific "smooth lacquer" effect.
*   **Shadows:** Use **Dithering** or Hard Bands (matte).

## **4. Case Integration**

### **4.1. Nameboard Consistency**
*   **Material:** Nameboard background must match the Cheek Block "Top" or "Side" color (`gray-900` or `gray-800`) to look like one unit.
*   **Continuity:** The Nameboard spans the full width (`TotalKeys + Cheeks`).
