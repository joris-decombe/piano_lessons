import * as THREE from 'three';

// Measurements from GRAND_PIANO.md (in mm)
// Scaling factor: 1 unit = 1mm
export const PIANO_MEASUREMENTS = {
    whiteKey: {
        width: 23.6,
        length: 150,
        height: 22, // Total height at front
        plasticThickness: 2, // Thickness of the white plastic top
        lipOverhang: 1.5, // Overhang at the front
        frontHeigth: 22,
        headLength: 50, // Front part
        tailLength: 100, // Back part
        cutWidth: 8.5, // Increased from 5.5 to accommodate 13.7mm black keys
    },
    blackKey: {
        baseWidth: 13.7,
        topWidth: 10.0,
        length: 95,
        height: 12, // Height ABOVE white key surface
        taper: (13.7 - 10.0) / 2, // Per side
    }
};

// Hardcoded Grand Piano Layout (Single Octave 0-11)
// Relative to the Left Edge of C (0mm)
export const GRAND_PIANO_LAYOUT: Record<number, { x: number, isBlack: boolean }> = {
    // White Keys (Center = Index * 23.6 + 11.8)
    0: { x: 11.8, isBlack: false },  // C
    2: { x: 35.4, isBlack: false },  // D
    4: { x: 59.0, isBlack: false },  // E
    5: { x: 82.6, isBlack: false },  // F
    7: { x: 106.2, isBlack: false }, // G
    9: { x: 129.8, isBlack: false }, // A
    11: { x: 153.4, isBlack: false }, // B

    // Black Keys (Asymmetric Placement)
    // C#: Left=15.38 -> Center=22.23
    1: { x: 22.23, isBlack: true },  // C#
    // D#: Left=41.72 -> Center=48.57
    3: { x: 48.57, isBlack: true },  // D#
    // F#: Left=85.495 -> Center=92.345
    6: { x: 92.345, isBlack: true }, // F#
    // G#: Left=111.15 -> Center=118.0
    8: { x: 118.0, isBlack: true },  // G#
    // A#: Left=136.805 -> Center=143.655
    10: { x: 143.655, isBlack: true }, // A#
};

/**
 * Creates a Shape for the White Key Profile (Top-Down View)
 * @param type Key shape type based on position
 * @param startOffset Start position along length (0 for Cap, 1.5 for Body)
 */
export const createWhiteKeyShape = (
    type: 'C_F' | 'D_G_A' | 'E_B',
    startOffset: number = 0
) => {
    const shape = new THREE.Shape();
    // Standard Grand Piano Octave is ~165mm (165/7 = 23.57mm stride).
    // Physical key head width is typically ~22.5mm.
    // We use Stride 23.6mm - Gap 1.1mm = 22.5mm Visual Width.
    const w = PIANO_MEASUREMENTS.whiteKey.width - 1.1;
    const l = PIANO_MEASUREMENTS.whiteKey.length;
    const headL = PIANO_MEASUREMENTS.whiteKey.headLength;
    const cutWidth = PIANO_MEASUREMENTS.whiteKey.cutWidth;

    // Start at Front-Left (0, startOffset)
    shape.moveTo(0, startOffset);

    // Front Face
    shape.lineTo(w, startOffset);

    // Right Side logic
    if (type === 'C_F' || type === 'D_G_A') {
        // Cut on Right
        shape.lineTo(w, headL); // Go up to head end
        shape.lineTo(w - cutWidth, headL); // Cut In
        shape.lineTo(w - cutWidth, l); // Go to back
    } else {
        // Straight Right (Type E_B)
        shape.lineTo(w, l);
    }

    // Back Face
    // (Already at correct X, l)

    // Left Side logic
    if (type === 'E_B' || type === 'D_G_A') {
        // Cut on Left
        // We are at back-leftish position from previous step
        shape.lineTo(cutWidth, l); // Back left corner of tail
        shape.lineTo(cutWidth, headL); // Forward to cut start
        shape.lineTo(0, headL); // Out to edge
    } else {
        // Straight Left (Type C_F)
        shape.lineTo(0, l);
    }

    // Close to Start
    shape.lineTo(0, startOffset);
    shape.closePath();

    return shape;
};


/**
 * Creates Black Key Trapezoidal Profile (Cross Section / Front View)
 * This profile is extruded along the length (Z-axis)
 */
export const createBlackKeyProfile = () => {
    const shape = new THREE.Shape();
    const baseW = PIANO_MEASUREMENTS.blackKey.baseWidth;
    const topW = PIANO_MEASUREMENTS.blackKey.topWidth;
    const h = PIANO_MEASUREMENTS.blackKey.height;

    const halfBase = baseW / 2;
    const halfTop = topW / 2;

    // Start at bottom-left
    shape.moveTo(-halfBase, 0);
    // Bottom-right
    shape.lineTo(halfBase, 0);

    // Top-right
    shape.lineTo(halfTop, h);

    // Top-left
    shape.lineTo(-halfTop, h);

    // Back to bottom-left
    shape.lineTo(-halfBase, 0);

    shape.closePath();

    return shape;
};
