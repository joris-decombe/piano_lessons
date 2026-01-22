/**
 * Virtual Piano Layout - Exact positions for all 88 keys
 * Based on standard piano measurements where:
 * - Octave span: 164.5mm (7 white keys)
 * - White key width: 23.5mm
 * - Black key width: 13.7mm (~58% of white key)
 * - Black keys positioned at specific offsets between white keys
 */

export interface PianoKeyLayout {
    note: string;
    isBlack: boolean;
    left: number;    // Position as percentage of total keyboard width
    width: number;   // Width as percentage of total keyboard width
}

/**
 * Generate exact positions for all 88 piano keys (A0 to C8)
 * Returns array of key layouts with precise positioning
 */
export function generatePianoLayout(): PianoKeyLayout[] {
    const keys: PianoKeyLayout[] = [];

    // Total keyboard: 52 white keys
    const whiteKeyWidth = 100 / 52; // Each white key is 1.923% of total width
    const blackKeyWidth = whiteKeyWidth * 0.58; // Black keys are 58% of white key width

    // Black key positions relative to the white key to their LEFT
    // These are the exact positions where black keys sit (as fraction of white key width)
    // Measured from real piano: black key center is at these positions from left white key's left edge
    const blackKeyPositions: Record<string, number> = {
        'C#': 0.7,   // C# sits 70% across C key (closer to D)
        'D#': 1.8,   // D# sits 80% past D key (closer to E)  
        'F#': 3.7,   // F# sits 70% across F key
        'G#': 4.75,  // G# sits 75% across G key (roughly centered)
        'A#': 5.8    // A# sits 80% past A key
    };

    const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let whiteKeyIndex = 0;

    // Generate all 88 keys (MIDI 21-108: A0 to C8)
    for (let midi = 21; midi <= 108; midi++) {
        const octave = Math.floor(midi / 12) - 1;
        const noteIndex = midi % 12;
        const noteName = NOTES[noteIndex];
        const fullName = `${noteName}${octave}`;
        const isBlack = noteName.includes("#");

        let left = 0;

        if (isBlack) {
            // Black key: position based on which white keys it sits between
            // Find the white key to the left of this black key
            const whiteKeyToLeft = Math.floor(whiteKeyIndex);
            const positionKey = noteName as keyof typeof blackKeyPositions;
            const relativePosition = blackKeyPositions[positionKey];

            // Calculate absolute position
            // Black key is centered at relativePosition * whiteKeyWidth from the start of the octave
            const octaveStart = Math.floor(whiteKeyToLeft / 7) * 7 * whiteKeyWidth;
            left = octaveStart + (relativePosition * whiteKeyWidth) - (blackKeyWidth / 2);
        } else {
            // White key: evenly spaced
            left = whiteKeyIndex * whiteKeyWidth;
            whiteKeyIndex++;
        }

        keys.push({
            note: fullName,
            isBlack,
            left,
            width: isBlack ? blackKeyWidth : whiteKeyWidth
        });
    }

    return keys;
}
