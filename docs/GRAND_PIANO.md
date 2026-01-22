# Grand Piano Key Measurements & Characteristics

## Official Documentation for Piano Keyboard Implementation

This document provides accurate measurements, geometric profiles, and material specifications for implementing a realistic 88-key grand piano keyboard. It supports both **2D (CSS/Canvas)** and **3D (WebGL/XR)** workflows.

---

## 1. Keyboard Overview

### Key Count

* **Total Keys**: 88
* **White Keys**: 52
* **Black Keys**: 36
* **Range**: A0 to C8

### Octave Structure

* **First Octave (Partial)**: A0, A#0, B0 (3 keys)
* **Complete Octaves**: C1-B1 through C7-B7 (7 octaves, 84 keys)
* **Last Key**: C8 (1 key)
* **Octave Span**: 164mm - 165mm (Standard width of 7 white keys)

---

## 2. Key Dimensions (Physical)

### White Keys

* **Width**: 23.6mm (Derived from standard 165mm octave span)
* **Total Visible Length**: 150mm
* **Key Head Length**: 50mm (The wide front section before the black key)
* **Key Tail Length**: 100mm (The narrow section between black keys)
* **Shape**: Rectangular with a distinct vertical "lip" (overhang) at the front face.
* **Gap**: 1.0mm - 1.5mm gap between keys.

### Black Keys

* **Visible Length**: 95mm
* **Height**: 12mm (Above white key surface)
* **Base Width**: 13.7mm (At the keybed)
* **Top Surface Width**: ~12.0mm (At the playing surface)
* **Taper**: ~0.85mm inset per side (Trapezoidal profile)
* **Shape**: **Prism/Trapezoid** with a flat top surface.
* **Edges**: Chamfered/eased corners (1-2mm radius). **NOT** rounded/arched at the back.

### Key Proportions

```text
Black Key Base Width = White Key Width × 0.58
Black Key Top Width  = White Key Width × 0.50
Black Key Length     = White Key Length × 0.63

```

---

## 3. Black Key Positioning

### Critical Rule

**Black keys are NOT uniformly centered between white keys.** They are positioned to maximize the width of the white key "tails" (the back part of the white key).

### Positioning Pattern (Offset Logic)

| Black Key | Visual Center Relative to Gap | CSS Offset Logic (Left Margin) |
| --- | --- | --- |
| **C#** | Shifted **Left** | `(Width_C * 1) - (Width_Bk * 0.60)` |
| **D#** | Shifted **Right** | `(Width_C * 2) - (Width_Bk * 0.40)` |
| **F#** | Shifted **Left** | `(Width_C * 4) - (Width_Bk * 0.65)` |
| **G#** | **Centered** (or slightly left) | `(Width_C * 5) - (Width_Bk * 0.50)` |
| **A#** | Shifted **Right** | `(Width_C * 6) - (Width_Bk * 0.35)` |

---

## 4. Visual Implementation (2D / CSS)

### White Keys

* **Shape**: Rectangular body with slightly rounded front corners (`border-radius: 0 0 2px 2px`).
* **Color**: High-gloss white gradient.
* Top: `#ffffff` (Pure, reflective)
* Middle: `#fdfdfd`
* Bottom: `#f0f0f0` (Subtle shading)


* **Highlights**:
* Top Edge: `inset 0 1px 0 rgba(255,255,255,1.0)`
* Reflections: Subtle vertical gradient to indicate gloss.


* **Shadows**: Drop shadow `0 2px 4px rgba(0,0,0,0.15)`

### Black Keys

* **Shape**: Trapezoidal look simulated via margins or clip-path.
* **Corners**: `border-radius: 1px 1px 0 0` (Sharp but eased).
* **Color**: Jet Black (`#000000` body).
* **Highlights**:
* **Top Surface Glare**: `linear-gradient(to bottom, #333 0%, #000 15%)`
* **Side Bevels**: `inset 1px 0 1px rgba(255,255,255,0.15)` (Simulates the taper catching light).


* **Shadows**: Strong, sharp shadow casting onto white keys `0 4px 8px rgba(0,0,0,0.6)`.

### Layering (Z-Index Strategy)

1. **Black Keys (Active)**: `z-index: 40`
2. **Black Keys (Inactive)**: `z-index: 30`
3. **White Keys (Active)**: `z-index: 20`
4. **White Keys (Inactive)**: `z-index: 0`

---

## 5. 3D Modeling & Mesh Specifications (WebGL / XR)

### A. Geometry & Topology

#### Black Key Profile (Trapezoid)

The black key is a frustum (pyramid with the top cut off), not a box.

* **Draft Angle**: ~4° inward slope on side walls.
* **Front Face**: Slightly angled back (91-92°) or vertical.
* **Top Edges**: Chamfered/Beveled.
* **Bevel Radius**: 0.75mm - 1.0mm (Standard).


* **Top Surface**: Flat.

#### White Key Profile

* **Front Lip**: The top surface extends 1.5mm past the front vertical face.
* **Side Walls**: Vertical.
* **Edges**:
* **Top-Front Corner**: Rounder (approx 2mm radius).
* **Side Edges**: Sharper (approx 0.5mm radius).



### B. White Key Variations (The "3-Shape" Rule)

You cannot use one mesh for all white keys. The "notch" (cutout) for the black keys changes.

1. **Left-Straight / Right-Cut**: Keys **C, F**.
2. **Both-Cut (T-Shape)**: Keys **D, G, A**.
3. **Left-Cut / Right-Straight**: Keys **E, B**.

### C. Pivot Points (Rigging)

For realistic animation, keys must rotate, not just translate down.

* **Pivot Origin (White Key)**: Located **~230mm behind the front edge** of the key (hidden inside the piano body).
* **Pivot Origin (Black Key)**: Located **~200mm behind the front edge** of the black key.
* **Rotation Axis**: X-Axis (Pitch).

### D. Polycount Budget (Per Key)

* **Low Poly**: ~100 tris (Bevels baked).
* **High Poly**: ~800-1200 tris (Real geometry bevels).

---

## 6. Materials & Shaders (PBR)

### White Key Material (Acrylic/Ivorite)

* **Albedo**: `#FFFFF5` (Ivory White) or `#FDFDFD`.
* **Roughness**: `0.02` - `0.05` (High Polish / Wet look).
* **Transmission/SSS**: Enable **Subsurface Scattering**.
* **Radius**: `[1.0, 0.2, 0.1]` (Warm light bleeds through edges).


* **IOR**: `1.54` (Standard Acrylic).

### Black Key Material (Ebony/Phenolic)

* **Albedo**: `#050505` (Never pure black `#000000`).
* **Roughness**: `0.25` - `0.35` (Satin) or `0.05` (High Gloss).
* **Anisotropy**: Optional `0.5` for wood grain simulation.

---

## 7. Animation Physics

### Key Press Mechanics

* **Action**: Rotation around the hidden pivot point.
* **Physical Travel (Dip)**:
* **Front of White Key**: -10mm (down).
* **Front of Black Key**: -9.5mm to -10mm (down).


* **Visual Translation (2D)**: `translateY(4px)` to `translateY(6px)` (1px is too shallow).
* **Rotation**: Approx **-2.5° to -3.0°** (or `rotateX(-2deg)` in CSS).

### Timing Curves

* **Attack (Press)**: Fast, non-linear `ease-out-quad` (50-80ms).
* **Release**: Damped oscillation (key bounces slightly when returning).

---

## 8. Common Mistakes to Avoid

❌ **Don't:**

* Instance the same white key mesh 52 times (You need C, D, and E variants).
* Make black keys "tombstone" shaped (rounded arch at the back).
* Use matte/paper texture (Grand pianos are polished).
* Center all black keys uniformly.
* Make the key travel too shallow (needs to look like ~10mm dip).

✅ **Do:**

* Use a trapezoidal shape for black keys (tapered).
* Make the top surface of black keys flat.
* Calculate offsets to ensure white key "tails" have usable width.
* Use high-contrast gloss effects.

---

## 9. Reference Measurements Code (Full)

```typescript
const PIANO_SPECS = {
  totalKeys: 88,
  
  whiteKey: {
    width: 23.6,        // mm
    length: 150,        // mm
    headLength: 50,     // mm
    tailLength: 100,    // mm
    height: 22,         // mm (physical block height for 3D)
    lipOverhang: 1.5,   // mm
    pivotOffset: -230,  // mm (distance from front)
    borderRadius: '0 0 2px 2px', // CSS style
  },
  
  blackKey: {
    baseWidth: 13.7,    // mm
    topWidth: 12.0,     // mm (tapered)
    length: 95,         // mm
    height: 12,         // mm (above white key)
    pivotOffset: -200,  // mm
    draftAngle: 4.0,    // degrees
    borderRadius: '1px 1px 0 0', // CSS style
  },
  
  // Offsets: % of White Key Width relative to the gap boundary
  offsets: {
    'C#': -0.60, 
    'D#': -0.40, 
    'F#': -0.65, 
    'G#': -0.50, 
    'A#': -0.35, 
  },
  
  physics: {
    maxDip: 10.0,       // mm
    maxRotation: 2.8,   // degrees
    zIndex: {
       blackActive: 40,
       blackIdle: 30,
       whiteActive: 20,
       whiteIdle: 0
    }
  }
};

```

---

## 10. Implementation Checklist

* [ ] 88 keys total (A0 to C8).
* [ ] Create 3 distinct White Key meshes (C-type, D-type, E-type).
* [ ] Black keys are trapezoidal (tapered ~4°).
* [ ] Black keys have flat tops (not rounded/arched).
* [ ] White keys are gloss/polished (not matte).
* [ ] **Key Head** is 50mm, **Key Tail** is 100mm.
* [ ] Black keys use correct non-centered offsets.
* [ ] **2D**: Use `z-index` 40/30/20/0 logic.
* [ ] **3D**: Pivot points set back (-230mm/-200mm) for rotation.
* [ ] Drop shadows cast onto white keys.
* [ ] Key press animation moves ~10mm (physical) or ~6px (visual).

---

## 11. Visual References

### A. White Key Side Profile (The "Lip")

The white key is not a simple rectangle. The top plastic surface hangs over the front.

```text
         Top Surface (Ivory/Plastic)
       ┌──────────────────────────────
       │
    ┌──┘  <-- 1.5mm Overhang (Lip)
    │  ┌──────────────────────────────
    │  │
    │  │  Keystick (Wood Body)
    └──┴──────────────────────────────

```

### B. White Key Top Topology (The "Carving")

Top-down view showing how keys are cut to fit the black keys.

**Type 1: Left-Straight / Right-Cut (C, F)**

```text
   ┌──────┐
   │ Tail │
   │ (13) │
   │      └──┐ <-- Cutout for C#/F#
   │         │
   │  Head   │
   │ (23.6)  │
   └─────────┘

```

**Type 2: Both-Cut / T-Shape (D, G, A)**

```text
      ┌──────┐
      │ Tail │
   ┌──┘      └──┐
   │            │
   │   Head     │
   │            │
   └────────────┘

```

**Type 3: Left-Cut / Right-Straight (E, B)**

```text
      ┌──────┐
      │ Tail │
   ┌──┘      │
   │         │ <-- Cutout for D#/A#
   │  Head   │
   │         │
   └─────────┘

```

### C. Black Key Cross-Section

```text
      Top Surface (12mm)
    ┌──────────────┐  
   /                \  ← Tapered Sides (Draft Angle)
  /                  \
 └────────────────────┘
    Base Width (13.7mm)

```

---

*Last Updated: 2026-01-22*
*For: Piano Lessons Application - Realistic Keyboard Implementation*

---

## 12. Virtualization Strategy (Learnings from Implementation)

### The "Slot" Problem
Real grand piano keys are extremely tight.
- **Problem**: Pure mathematical spacing (e.g., center points) often causes 3D collisions because mesh bevels/offsets reduce the effective "slot" size.
- **Solution**: The "Cut Width" of the white key tail must be larger than expected.
    - **Physical Spec**: 13.7mm Black Key.
    - **Required Slot**: **17.0mm** (White Key Cut Width = 8.5mm).
    - This provides ~1.65mm clearance on each side, allowing for slight misalignment without clipping.

### The "Misalignment" Reality
Grand pianos are **not symmetric**. The black keys are not centered between white keys.
- **Problem**: Using uniform offsets (e.g., "always centered") looks fake and inconsistent.
- **Solution**: Use a **Hardcoded Look-Up Table (LUT)** for the octave.
    - Do not calculate positions at runtime.
    - Define `GRAND_PIANO_LAYOUT` with exact millimeter center points.
    - **C#**: `22.23mm` (Left-biased)
    - **D#**: `48.57mm` (Right-biased)
    - **F#**: `92.345mm` (Left-biased)
    - **G#**: `118.0mm` (Center-ish)
    - **A#**: `143.655mm` (Right-biased)

### Hardcoding vs Procedural
For high-fidelity instruments, **Hardcoding > Procedural**.
- Procedural logic with floats introduces micro-drifts and requires complex collision logic.
- Hardcoded coordinates (Virtual Grand Piano) guarantee that every C# is identical and free of collisions.