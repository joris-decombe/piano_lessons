# **Pixel Piano: Master Specifications v1.0**

**Status:** Live Implementation  
**Theme:** "Satie" (Pixel Art / 2.5D Orthographic)  
**Architecture:** Standard Layering (Waterfall -> Keyboard)

---

## **1. Nomenclature & Taxonomy**

*   **Container/Bed:** The static "footprint" of the key on the floor. Always opaque (Void/Black).
*   **Face:** The top surface of the key that the user touches. Animates (shifts) when pressed.
*   **Frame:** The furniture surrounding the keys (Cheek Blocks, Nameboard, Key Slip).
*   **Nameboard:** The vertical board above the keys. Acts as a mirror.
*   **Key Slip:** The strip running along the bottom edge of the keys.
*   **Cheek Blocks:** The side blocks framing the keyboard.
*   **Void:** The empty space between keys.

---

## **2. Visual Architecture**

### **2.1. Z-Index Stack (Bottom to Top)**
1.  **Waterfall Track (z-10):** Falling notes. **Stops exactly at the top of the visible keys.**
    *   *Opacity:* `0.9` (Vibrant).
    *   *Texture:* Vertical Gradient (`linear-gradient`) to show motion.
2.  **Keyboard Container (z-20):** Contains Keys and Frame.
    *   **Keys:** Opaque objects.
    *   **Active Keys:** Render a semi-transparent **Color Overlay** on top of the opaque face.
3.  **Nameboard (z-30):** Opaque container covering the top edge of the waterfall.
4.  **Reflections (z-60):** Rendered on top of everything to ensure visibility.
5.  **Key Slip (z-60):** Bottom furniture piece.

### **2.2. The Satie-16 Palette**
Strict 16-color palette defined in `globals.css`.

| Variable | Hex | Role |
| :--- | :--- | :--- |
| **Voids** | `#000000` | Background, Key Pockets |
| **Frame (Main)** | `#111827` | Nameboard, Cheeks, Slip (Gray 900) |
| **Black Key (Face)** | `#1F2937` | Gray 800 |
| **Black Key (Highlight)** | `#374151` | Gray 700 |
| **White Key (Shadow)** | `#9CA3AF` | Gray 400 (Separators) |
| **White Key (Pressed)** | `#D1D5DB` | Gray 300 |
| **White Key (Face)** | `#E2E4E9` | Cool Gray 200 |
| **White Key (Highlight)** | `#F3F4F6` | Gray 100 |
| **Accent (Felt)** | `#9F1239` | Rose 800 |
| **Waterfall (Dark)** | `#0284C7` | Sky 600 |
| **Waterfall (Light)** | `#38BDF8` | Sky 400 |

---

## **3. Component Specifications**

### **3.1. Waterfall**
*   **Behavior:** Notes stop visually at the **Top of the Visible Key** (contact line).
*   **Clipping:** Constrained by parent container to never overlap the keys.
*   **Style:**
    *   **Fill:** Solid Color with "Nested Bevel" (16-bit style).
    *   **Border:** 1px solid black (`rgba(0,0,0,1)`).
    *   **Bevels:** 2px nested (Inner white 90%/40%, Inner black 60%/30%).
    *   **No Blur:** `drop-shadow` removed.

### **3.2. Keys**
*   **Animation:** "Face Shift"
    *   **White Key:** Face height reduces (`100%` -> `calc(100% - 2px)`), revealing the Bed at the south edge.
    *   **Black Key:** Top Face moves South (`calc(100% - 10px)` -> `calc(100% - 2px)`), covering the Front Face.
*   **Active State:** Renders a colored overlay (`opacity-50` to `60`) with **Nested Bevel** highlights.
*   **Borders:**
    *   **Right:** `1px solid var(--color-pal-6)` (Separator).
    *   **Left:** None (to avoid double borders with neighbor).
*   **Shadows:**
    *   **Internal:** 2px hard band (`inset`) on active white keys cast by neighbors.
    *   **Ambient Occlusion:** 1-2px hard band cast by black keys onto white keys.

### **3.3. Nameboard Reflections**
*   **Concept:** A vertical mirror reflection at the base of the Nameboard.
*   **Implementation:**
    *   **Source:** Reflects the **Key Material** (White/Black).
    *   **Geometry:** Narrow band (`2px` Idle, `4px` Active) at the bottom edge.
    *   **Active State:** Adds a bloom (`box-shadow`) but maintains neutral color (White/Black).

---

## **4. Case & Geometry**

### **4.1. Dimensions**
*   **Octave Width:** 168px (7 * 24px).
*   **White Key:** 24px wide, 150px tall.
*   **Black Key:** 14px wide, 96px tall.
*   **Cheek Blocks:** 36px wide.

### **4.2. Alignment**
*   **Nameboard:** Width must exactly match `TotalKeys + Cheeks`. Spacers are used to ensure reflection alignment.
*   **Cheek Blocks:** Borders must match Key Slip style (`pal-2`) to appear connected.

### **4.3. Octave Layout Table**

| Key | Type | X-Pos | Width | Note |
| :--- | :--- | :--- | :--- | :--- |
| **C** | White | **0px** | 24px | |
| **C#** | Black | **15px** | 14px | Left-biased |
| **D** | White | **24px** | 24px | |
| **D#** | Black | **43px** | 14px | Right-biased |
| **E** | White | **48px** | 24px | |
| **F** | White | **72px** | 24px | |
| **F#** | Black | **85px** | 14px | Strong Left-biased |
| **G** | White | **96px** | 24px | |
| **G#** | Black | **113px** | 14px | Centered |
| **A** | White | **120px** | 24px | |
| **A#** | Black | **141px** | 14px | Strong Right-biased |
| **B** | White | **144px** | 24px | |