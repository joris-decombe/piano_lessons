/**
 * Real Grand Piano Layout - 88 keys (A0 to C8)
 * Hardcoded exact positions - no algorithm, just real measurements
 */

export interface PianoKeyLayout {
    note: string;
    isBlack: boolean;
    left: number;    // Position as percentage of total keyboard width
    width: number;   // Width as percentage of total keyboard width
}

/**
 * Generate exact positions for all 88 piano keys
 * Positions are hardcoded based on real grand piano measurements
 */
export function generatePianoLayout(): PianoKeyLayout[] {
    const whiteKeyWidth = 100 / 52; // 52 white keys total

    // Real grand piano measurements (from PIANO_MEASUREMENTS.md):
    // White key: 23.6mm, Black key: 13.7mm (58% of white)
    // Black key height: 63% of white key length (95mm vs 150mm)
    const blackKeyWidth = whiteKeyWidth * 0.58;

    // Black key positioning uses offset formula:
    // leftPosition = (whiteKeyIndex * whiteKeyWidth) - (blackKeyWidth * multiplier)
    // Where multiplier determines the shift:
    // - C#: 0.60 (shifted left)
    // - D#: 0.40 (shifted right)
    // - F#: 0.65 (shifted left)
    // - G#: 0.50 (centered)
    // - A#: 0.35 (shifted right)

    const keys: PianoKeyLayout[] = [];
    let whiteKeyIndex = 0;

    // Generate all 88 keys (A0 to C8)
    for (let midi = 21; midi <= 108; midi++) {
        const noteIndex = (midi - 21) % 12;
        const octave = Math.floor((midi - 12) / 12);
        const noteNames = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
        const note = noteNames[noteIndex] + octave;
        const isBlack = note.includes("#");

        if (!isBlack) {
            // White key: position at current white key index
            keys.push({
                note,
                isBlack: false,
                left: whiteKeyIndex * whiteKeyWidth,
                width: whiteKeyWidth
            });
            whiteKeyIndex++;
        } else {
            // Black key: calculate using offset formula
            // Position relative to the white key to the LEFT of this black key
            const blackKeyType = note.substring(0, 2); // "C#", "D#", etc.
            let multiplier: number;

            switch (blackKeyType) {
                case "C#": multiplier = 0.60; break; // Shifted left
                case "D#": multiplier = 0.40; break; // Shifted right
                case "F#": multiplier = 0.65; break; // Shifted left
                case "G#": multiplier = 0.50; break; // Centered
                case "A#": multiplier = 0.35; break; // Shifted right
                default: multiplier = 0.50; // Fallback to centered
            }

            // leftPosition = (current white key index) - (blackKeyWidth * multiplier)
            const left = (whiteKeyIndex * whiteKeyWidth) - (blackKeyWidth * multiplier);

            keys.push({
                note,
                isBlack: true,
                left,
                width: blackKeyWidth
            });
        }
    }

    return keys;
}
