export const OCTAVE_WIDTH = 168; // 7 white keys * 24px

// Offset table relative to C start (0px)
export const NOTE_OFFSETS: Record<number, number> = {
    0: 0,   // C
    1: 15,  // C#
    2: 24,  // D
    3: 43,  // D#
    4: 48,  // E
    5: 72,  // F
    6: 85,  // F#
    7: 96,  // G
    8: 113, // G#
    9: 120, // A
    10: 141,// A#
    11: 144 // B
};

// A0 is MIDI 21. Relative to C1 (24): -3 semitones.
// Base Calc: (floor(-3/12) * 168) + Offset[9] = (-1 * 168) + 120 = -48px.
// We shift everything by +48px so A0 is at 0px.
export const SCREEN_OFFSET = 48;

export function getKeyPosition(midi: number) {
    const relativeToC1 = midi - 24;
    const octave = Math.floor(relativeToC1 / 12);
    const noteIndex = ((relativeToC1 % 12) + 12) % 12; // Handle negative modulo

    const left = (octave * OCTAVE_WIDTH) + NOTE_OFFSETS[noteIndex] + SCREEN_OFFSET;

    // Specs: White 24px, Black 14px
    const isBlack = [1, 3, 6, 8, 10].includes(noteIndex);
    const width = isBlack ? 14 : 24;

    return { left, width, isBlack };
}

export function getTotalKeyboardWidth() {
    // 88 keys ends at C8 (108).
    // But calculate based on the LAST key's position + width.
    // C8 is MIDI 108.
    const { left, width } = getKeyPosition(108);
    return left + width;
}
