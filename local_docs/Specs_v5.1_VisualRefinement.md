# **Pixel Piano: v5.1 Visual Refinement Specs**

**Status:** Research & Draft  
**Version:** 5.1  
**Goal:** Refine the 2.5D rendering by stopping the waterfall at the visible key edge, fixing reflection color/height, and restoring the adaptive shadow system.

## **1. Waterfall: The Contact Line**
*   **Behavior:** Notes must stop exactly at the **Top of the Visible Key** (the line where the nameboard meets the keyboard). 
*   **Layering:** Waterfall is placed at `z-10` (Behind the Nameboard and Keys). This ensures the note "hits" the furniture and vanishes behind the nameboard lip.
*   **Overshoot:** Revert any extension of notes into the keyboard area.

## **2. Key Animation: Transparent Color Overlay**
*   **Base:** Keys return to being **Opaque** objects (White/Black material).
*   **Active State:** 
    *   The key face remains visible but receives a **Color Overlay** (Active Color at ~50% opacity or solid depending on the "glow" feel).
    *   **Animation:** The physical "Face Shift" (the 1px dip) is maintained for tactile feedback.
*   **Shadows:** Restore the **Adaptive Shadow System**:
    *   Internal shadows (neighbor-aware) must render **on top** of the color overlay to preserve 3D volume.
    *   Black keys must not animate or shift when an adjacent white key is pressed.

## **3. Nameboard Reflections: Mirrored Key States**
*   **Source:** Reflect the **Key State**, not the falling notes.
*   **Color Logic:**
    *   Reflection of White Key = Faint White/Light Gray.
    *   Reflection of Black Key = Deep Gray/Black (subtle).
    *   Reflection of Active Key = Active Color (Glow).
*   **Geometry:**
    *   **Height:** Reduced to a narrow band of **4px to 6px**.
    *   **Position:** Fixed at the base of the Nameboard, "facing" the keys.

## **4. Case Alignment**
*   Ensure the Nameboard, Cheek Blocks, and Key Slip form a gapless "Piano Shell" that contains the keys.
