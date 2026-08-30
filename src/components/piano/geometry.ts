
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
                cutLeft = (prevRight - currentLeft) + 1; // 1px Clearance
            }
        }
    }

    // Check Right Neighbor (midi + 1)
    if (midi < 108) { // Not C8
        const { left: nextLeft, isBlack: nextIsBlack } = getKeyPosition(midi + 1);
        if (nextIsBlack) {
            // Overlap = Current End - Next Start
            const currentRight = currentLeft + currentWidth;
            if (currentRight > nextLeft) {
                cutRight = (currentRight - nextLeft) + 1; // 1px Clearance
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

// ---------------------------------------------------------------------------
// Key ranges
//
// The stage is laid out for all 88 keys, which is 24px per white key — far more
// than a phone can give. Rather than shrink everything, the lesson can show a
// slice of the keyboard: the coordinates below stay exactly as they are, and
// the containers shift and clip to the slice.
// ---------------------------------------------------------------------------

export const LOWEST_KEY = 21;  // A0
export const HIGHEST_KEY = 108; // C8

export interface KeyRange {
    low: number;
    high: number;
}

export const FULL_RANGE: KeyRange = { low: LOWEST_KEY, high: HIGHEST_KEY };

const BLACK_NOTE_INDICES = [1, 3, 6, 8, 10];

export function isBlackKey(midi: number): boolean {
    return BLACK_NOTE_INDICES.includes(((midi % 12) + 12) % 12);
}

/**
 * Widen a range outward until both ends land on white keys, and clamp it to the
 * keyboard. A slice that started on a black key would cut it in half — black
 * keys overhang the white key to their left.
 */
export function snapRangeToWhiteKeys(range: KeyRange): KeyRange {
    let low = Math.min(Math.max(range.low, LOWEST_KEY), HIGHEST_KEY);
    let high = Math.min(Math.max(range.high, LOWEST_KEY), HIGHEST_KEY);
    if (high < low) high = low;
    while (low > LOWEST_KEY && isBlackKey(low)) low--;
    while (high < HIGHEST_KEY && isBlackKey(high)) high++;
    // A range that hit the very bottom or top may still start on a black key
    while (isBlackKey(low) && low < high) low++;
    while (isBlackKey(high) && high > low) high--;
    return { low, high };
}

/**
 * Where a range sits in stage coordinates: how far the containers shift left,
 * and how wide they end up. The full range gives `{ offset: 0, width: 1248 }`,
 * which is exactly the layout the app has always used.
 */
export function getRangeMetrics(range: KeyRange): {
    offset: number;
    width: number;
    low: number;
    high: number;
} {
    const { low, high } = snapRangeToWhiteKeys(range);
    const first = getKeyPosition(low);
    const last = getKeyPosition(high);
    return {
        offset: first.left,
        width: last.left + last.width - first.left,
        low,
        high,
    };
}

export function getTotalPianoWidth() {
    return 36 + getTotalKeyboardWidth() + 36;
}
