# **Pixel Piano: v6 Back to Basics Specs**

**Status:** Research & Draft  
**Version:** 6.0  
**Goal:** Fix visual regressions by reverting "Underlay" architecture and refining the classic 2.5D look.

## **1. Waterfall**
*   **Stop Point:** Notes stop exactly at the **Top of the Visible Key** (contact line). They do **not** extend over the key.
*   **Visual:** Solid/Gradient blocks. No particles. `z-index` should be `10` (Below Nameboard).

## **2. Key Animation (Revert)**
*   **State:** Keys are **Opaque** objects.
*   **Active:**
    *   **White Key:** Face color changes to `activeColor` (with partial transparency over the white base, or solid).
    *   **Black Key:** Face color changes to `activeColor`.
*   **Shadows:** The "Complex Adaptive Shadow System" (Internal Shadows + AO) must be rendered **on top** of the active color.

## **3. Reflections**
*   **Source:** Reflect the **KEY**, not the Waterfall Note.
*   **Logic:**
    *   **White Key:** Reflection is Light Gray / White.
    *   **Black Key:** Reflection is Dark Gray / Black.
    *   **Active Key:** Reflection takes on the `activeColor`.
*   **Geometry:**
    *   **Height:** Narrow band (`4px` - `6px`).
    *   **Alignment:** Strictly 1:1 with key width/left.
    *   **Direction:** "Facing the keys" (Downward mirror). This means simply drawing the band at the bottom of the nameboard.

## **4. Layout**
*   **Z-Index:** Nameboard (`z-30`) > Keys (`z-20`) > Waterfall (`z-10`).
*   **Alignment:** Keep the `totalPianoWidth` fix (Cheeks + Keys).
