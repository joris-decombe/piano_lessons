
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

export const SCREEN_OFFSET = 48;

export function getKeyPosition(midi: number) {
    const relativeToC1 = midi - 24;
    const octave = Math.floor(relativeToC1 / 12);
    const noteIndex = ((relativeToC1 % 12) + 12) % 12;

    const left = (octave * OCTAVE_WIDTH) + NOTE_OFFSETS[noteIndex] + SCREEN_OFFSET;

    const isBlack = [1, 3, 6, 8, 10].includes(noteIndex);
    const width = isBlack ? 14 : 24;

    return { left, width, isBlack, octave, noteIndex };
}

// Precise Cut Calculation
// We determine how much a white key is covered by adjacent black keys.
export function getKeyCuts(midi: number) {
    const { left: currentLeft, width: currentWidth, isBlack } = getKeyPosition(midi);

    if (isBlack) return { cutLeft: 0, cutRight: 0 };

    let cutLeft = 0;
    let cutRight = 0;

    // Check Left Neighbor (midi - 1)
    if (midi > 21) { // Not A0
        const { left: prevLeft, width: prevWidth, isBlack: prevIsBlack } = getKeyPosition(midi - 1);
        if (prevIsBlack) {
            // Overlap = Previous End - Current Start
            const prevRight = prevLeft + prevWidth;
            if (prevRight > currentLeft) {
                cutLeft = (prevRight - currentLeft) + 2; // Reverted to 2px
            }
        }
    }

    // Check Right Neighbor (midi + 1)
    if (midi < 108) { // Not C8
        const { left: nextLeft, width: nextWidth, isBlack: nextIsBlack } = getKeyPosition(midi + 1);
        if (nextIsBlack) {
            // Overlap = Current End - Next Start
            const currentRight = currentLeft + currentWidth;
            if (currentRight > nextLeft) {
                cutRight = (currentRight - nextLeft) + 2; // Reverted to 2px
            }
        }
    }

    // Add a tiny buffer (0.5px) to cuts to ensure no sub-pixel bleeding? 
    // Or keep exact. Let's keep exact for now.
    return { cutLeft, cutRight };
}

export function getTotalKeyboardWidth() {
    const { left, width } = getKeyPosition(108);
    return left + width;
}
