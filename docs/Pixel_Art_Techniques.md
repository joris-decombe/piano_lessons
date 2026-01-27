# Pixel Art & 2.5D Techniques Reference

**Purpose:** A technical guide for implementing strict pixel art aesthetics and 2.5D projection in the Piano Lessons project.

## 1. The 2.5D Top-Down Projection

### 1.1. Concept
In a strictly 2D engine (DOM/Canvas), "3D" depth is an illusion created by projection.
*   **Perspective:** Orthographic (Parallel lines never converge).
*   **Orientation:** Top-Down (User looks down the Y-axis).

### 1.2. Simulating Height (Z-Axis)
Since we only have X and Y, we simulate Z (Up/Down) using Y-offsets and layering.
*   **Rule:** `Visual_Y = World_Y - Z_Height`
*   **Implication:** An object "higher" in the air (like a falling note) is drawn higher up the screen (smaller Y value) than its shadow, which rests on the ground.

## 2. Animation Mechanics: The "Face Shift"

Simulating a pivoting object (like a piano key) without 3D rotation requires separating the object into layers.

### 2.1. The "Traveling Pocket" Problem
Translating an entire sprite (container + face) creates unrealistic collisions with neighboring static objects.

### 2.2. The Solution: Layer Separation
1.  **The Bed (Static):** Represents the footprint on the floor. It **never moves**.
2.  **The Face (Dynamic):** Represents the top surface.
    *   **To Pivot "Away" (North):** Move the Face's *South Edge* Northwards (shortening the face).
    *   **To Pivot "Towards" (South):** Move the Face's *North Edge* Southwards (revealing the back).

**Visual Formula:**
`Pressed_Key_Height = Idle_Key_Height - Dip_Amount`
*The top edge (pivot point) remains strictly locked to the grid.*

## 3. Shading & Depth Techniques

### 3.1. No Blurs / No Alpha
True pixel art relies on explicit color choices, not algorithmic blending.
*   **Bad:** `box-shadow: 0 4px 5px rgba(0,0,0,0.5)` (Creates sub-pixel blur).
*   **Good:** `box-shadow: 0 4px 0px #000000` (Hard cast shadow).

### 3.2. Dithering (Transparency Simulation)
To simulate partial opacity (like a shadow) without creating new colors:
*   **Pattern:** Use a 1px checkerboard pattern (on/off pixels).
*   **Effect:** The eye blends the background and foreground colors.
*   **Implementation:** SVG Patterns or CSS `mask-image` with a repeating dither texture.

### 3.3. Banding (Gradients)
To simulate curvature or lighting gradients:
*   **Technique:** Use distinct bands of color from the palette.
*   **Rule:** Minimum band width should be 2-3 visual pixels to avoid "noise".

## 4. Grid & Precision

### 4.1. The Pixel Grid
*   **Sub-pixels are forbidden.** All coordinates and sizes must be integers.
*   **Line Weight:** Standardize on 1px or 2px outlines. Do not mix them arbitrarily.

### 4.2. Palette Management
*   **Strict Limit:** Use a fixed palette (e.g., 16 colors).
*   **Ramps:** Define specific "Light -> Mid -> Dark" ramps for materials (e.g., White Key Ramp, Black Key Ramp).
*   **No stray hex codes:** Every color must be a variable mapped to the palette.
