# **Pixel Piano: v4 Pixel Art & Dynamism Specs**

**Status:** Research Complete  
**Goal:** Transition to a strict "2.5D Orthographic Pixel Art" style with "Face Shift" mechanics.

## **1. Geometry & Animation: The "Face Shift" Mechanic**

### **1.1. The Problem (Traveling Pockets)**
*   **Observation:** Translating the entire key component (`translateY`) moves the "void" cutouts, causing visual collisions with black keys.
*   **The Solution:** **Separation of Concerns.**
    *   **Layer 1: The Bed (Static):** The dark container, the void, and the black key holes. This **NEVER MOVES**.
    *   **Layer 2: The Face (Dynamic):** The white/black top surface.
*   **Animation Logic:**
    *   **Unpressed:** Face covers the Bed entirely (height: 100%).
    *   **Pressed:** Face "Shortens" or "Slides North".
        *   **Action:** The *South Edge* of the Face moves North by 1px or 2px.
        *   **Result:** This exposes the **Bed** (or Key Slip) at the bottom.
        *   **Constraint:** The North Edge (Pivot) and the Cutouts must remain pixel-perfectly static relative to the Bed.

### **1.2. Black Key "Submersion"**
*   **Current:** `border-bottom` changes thickness.
*   **Refined:** The Black Key Face (lighter top pixel block) moves South (down) *over* its own darker "Front Face" (border).
    *   **Pressed:** The Lighter Top Face obscures the Darker Front Face. The total silhouette remains roughly the same, but the "Face" creates the motion.

## **2. Visual Style: Strict Pixel Art**

### **2.1. No Blurs / No Alpha Blends**
*   **Rule:** `box-shadow`, `blur()`, and `opacity` (unless for scanlines) are banned.
*   **Replacement:**
    *   **Shadows:** Use **Dithering** (1px checkerboard pattern) or hard-edged dark bands.
    *   **Gradients:** Use **Banding** (Stepped colors).

### **2.2. The Palette**
*   Define a strict **16-Color Palette** (e.g., Pico-8 Extended or custom).
*   All colors (Highlights, Shadows, Voids) must pick from this palette.
    *   *Void:* `#000000`
    *   *Frame:* `#1d2b53` (Dark Blue/Grey)
    *   *White Key:* `#c2c3c7` (Light Grey) -> `#fff1e8` (Highlight)
    *   *Black Key:* `#292d3e` -> `#5f574f` (Highlight)

### **2.3. Reflections (Grid Alignment)**
*   **Issue:** Global gradient misaligns with keys.
*   **Fix:** **Per-Key Reflections.**
    *   The Nameboard is a static dark bar.
    *   Each `Key` component renders a "Ghost Reflection" div *above* itself (negative Y), masked by the Nameboard container.
    *   This ensures the reflection aligns 1:1 with the key, regardless of gap width.

## **3. Waterfall Dynamism: "Surface Flow"**

### **3.1. The "Paint" Effect**
*   **Concept:** The note isn't a separate block that stops; it is "paint" pouring onto the key.
*   **Implementation:**
    *   The falling note is `z-index: 50`.
    *   The Key Face is `z-index: 10`.
    *   **The Trick:** When a note hits the key, we render a **"Key Overlay"** on the Key Face.
    *   This overlay is masked to the Key's exact shape but colored to match the note.
    *   **Animation:** The overlay can "scroll" texture down the key to simulate flow velocity.

## **4. Implementation Plan**

1.  **Refactor `Key.tsx`**: Split into `<KeyBed />` and `<KeyFace />`. Move `onClick` / animation logic to affect `<KeyFace />` transform/height only.
2.  **Palette System:** Create `palette.ts` and Tailwind config for the 16 colors. Replace all hex/RGB colors.
3.  **Dithering Utils:** Create generic SVG patterns for shadows.
4.  **Reflection Component:** Move reflection logic into the `Key` (or a mapped sibling).