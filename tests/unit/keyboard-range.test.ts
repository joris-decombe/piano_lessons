import { describe, it, expect } from 'vitest';
import {
    FULL_RANGE,
    getKeyPosition,
    getRangeMetrics,
    getTotalKeyboardWidth,
    isBlackKey,
    snapRangeToWhiteKeys,
} from '@/components/piano/geometry';
import {
    KEYBOARD_HEIGHT_PX,
    STAGE_PADDING,
    chooseKeyRange,
    getSongRange,
    getStageLayout,
    isCropped,
} from '@/lib/keyboard-range';

const DESKTOP = 1280;
const IPHONE_PORTRAIT = 390;
const IPHONE_LANDSCAPE = 750;

/** White keys inside a range */
function whiteKeys(range: { low: number; high: number }): number {
    let n = 0;
    for (let m = range.low; m <= range.high; m++) if (!isBlackKey(m)) n++;
    return n;
}

function midi(...notes: number[]) {
    return { tracks: [{ notes: notes.map(m => ({ midi: m })) }] };
}

describe('white-key snapping', () => {
    it('knows the black keys', () => {
        expect(isBlackKey(61)).toBe(true);  // C#4
        expect(isBlackKey(60)).toBe(false); // C4
        expect(isBlackKey(21)).toBe(false); // A0
    });

    it('widens outward until both ends are white keys', () => {
        // A slice starting on C#4 would cut that black key in half, since it
        // overhangs the white key to its left.
        expect(snapRangeToWhiteKeys({ low: 61, high: 70 })).toEqual({ low: 60, high: 71 });
        expect(snapRangeToWhiteKeys({ low: 60, high: 72 })).toEqual({ low: 60, high: 72 });
    });

    it('clamps to the keyboard', () => {
        expect(snapRangeToWhiteKeys({ low: 0, high: 500 })).toEqual(FULL_RANGE);
    });

    it('survives an inverted range', () => {
        const range = snapRangeToWhiteKeys({ low: 70, high: 60 });
        expect(range.low).toBeLessThanOrEqual(range.high);
    });
});

describe('range metrics', () => {
    it('leaves the full keyboard exactly where it has always been', () => {
        const metrics = getRangeMetrics(FULL_RANGE);
        expect(metrics.offset).toBe(0);
        expect(metrics.width).toBe(getTotalKeyboardWidth());
        expect(metrics.width).toBe(1248);
    });

    it('measures a slice from its first key to the end of its last', () => {
        const metrics = getRangeMetrics({ low: 60, high: 72 });
        const first = getKeyPosition(60);
        const last = getKeyPosition(72);
        expect(metrics.offset).toBe(first.left);
        expect(metrics.width).toBe(last.left + last.width - first.left);
    });

    it('shifts a key by exactly the offset, so the keys and notes still line up', () => {
        const metrics = getRangeMetrics({ low: 60, high: 72 });
        expect(getKeyPosition(60).left - metrics.offset).toBe(0);
    });
});

describe('getSongRange', () => {
    it('finds the outermost notes across every track', () => {
        expect(getSongRange({
            tracks: [{ notes: [{ midi: 60 }, { midi: 64 }] }, { notes: [{ midi: 48 }] }],
        })).toEqual({ low: 48, high: 64 });
    });

    it('returns null when there is nothing to measure', () => {
        expect(getSongRange(null)).toBeNull();
        expect(getSongRange({ tracks: [] })).toBeNull();
        expect(getSongRange({ tracks: [{ notes: [] }] })).toBeNull();
    });
});

describe('chooseKeyRange', () => {
    it('keeps the whole keyboard on a desktop', () => {
        expect(chooseKeyRange(getSongRange(midi(60, 64)), DESKTOP)).toEqual(FULL_RANGE);
    });

    it('keeps the whole keyboard before the width has been measured', () => {
        expect(chooseKeyRange(getSongRange(midi(60)), 0)).toEqual(FULL_RANGE);
    });

    it('narrows to the piece on a phone', () => {
        const range = chooseKeyRange(getSongRange(midi(38, 74)), IPHONE_PORTRAIT);
        expect(range).not.toEqual(FULL_RANGE);
        // Everything the piece plays is still on screen
        expect(range.low).toBeLessThanOrEqual(38);
        expect(range.high).toBeGreaterThanOrEqual(74);
    });

    it('never hides a note, however wide the piece', () => {
        for (const [low, high] of [[21, 108], [27, 97], [60, 62]]) {
            const range = chooseKeyRange({ low, high }, IPHONE_PORTRAIT);
            expect(range.low).toBeLessThanOrEqual(low);
            expect(range.high).toBeGreaterThanOrEqual(high);
        }
    });

    it('falls back to the full keyboard when the song is unknown', () => {
        expect(chooseKeyRange(null, IPHONE_PORTRAIT)).toEqual(FULL_RANGE);
    });

    it('makes a phone key several times wider than the full board would', () => {
        const full = getStageLayout(FULL_RANGE, IPHONE_PORTRAIT);
        const cropped = getStageLayout(
            chooseKeyRange(getSongRange(midi(38, 74)), IPHONE_PORTRAIT),
            IPHONE_PORTRAIT,
        );
        expect(cropped.scale).toBeGreaterThan(full.scale * 1.8);
    });
});

describe('showing enough keyboard to place the piece', () => {
    /** One octave in the middle, like Twinkle */
    const TINY = { low: 60, high: 72 };

    it('does not leave a one-octave island on a screen with room to spare', () => {
        // 876px is the worst case: the full board misses the legible minimum by
        // a fraction, and the old rule fell all the way back to the piece.
        const range = chooseKeyRange(TINY, 852);
        expect(whiteKeys(range)).toBeGreaterThan(40);
    });

    it('grows outward from the piece rather than off to one side', () => {
        const range = chooseKeyRange(TINY, 366);
        expect(range.low).toBeLessThan(TINY.low);
        expect(range.high).toBeGreaterThan(TINY.high);
    });

    it('keeps the keys at a readable width while it grows', () => {
        for (const width of [366, 500, 726, 852]) {
            const layout = getStageLayout(chooseKeyRange(TINY, width), width);
            expect(layout.scale * 24, `at ${width}px`).toBeGreaterThanOrEqual(15.9);
        }
    });

    it('never shrinks a piece that is already wider than the budget', () => {
        const wide = { low: 27, high: 97 };  // Clair de Lune
        const range = chooseKeyRange(wide, 366);
        expect(range.low).toBeLessThanOrEqual(wide.low);
        expect(range.high).toBeGreaterThanOrEqual(wide.high);
    });

    it('shows several octave landmarks wherever it crops', () => {
        for (const width of [366, 726, 852]) {
            const range = chooseKeyRange(TINY, width);
            let landmarks = 0;
            for (let m = range.low; m <= range.high; m++) if (m % 12 === 0) landmarks++;
            expect(landmarks, `octave labels at ${width}px`).toBeGreaterThanOrEqual(3);
        }
    });

    it('still hands back the whole keyboard when it fits', () => {
        expect(isCropped(chooseKeyRange(TINY, DESKTOP))).toBe(false);
        expect(isCropped(chooseKeyRange(TINY, 366))).toBe(true);
    });
});

describe('getStageLayout', () => {
    it('reproduces the old full-keyboard stage', () => {
        const layout = getStageLayout(FULL_RANGE, DESKTOP);
        expect(layout.stageWidth).toBe(getTotalKeyboardWidth() + STAGE_PADDING);
        expect(layout.stageWidth).toBe(1296);
        expect(layout.scale).toBeCloseTo(DESKTOP / 1296, 5);
    });

    it('never scales past 1, so the pixel art is not stretched', () => {
        expect(getStageLayout({ low: 60, high: 72 }, DESKTOP).scale).toBe(1);
    });

    it('stops the keyboard eating a short screen', () => {
        // A phone in landscape is ~230px of stage; unchecked, a 150px keyboard
        // would take two thirds of it and leave the notes nowhere to fall.
        const layout = getStageLayout({ low: 36, high: 76 }, IPHONE_LANDSCAPE, 230);
        expect(KEYBOARD_HEIGHT_PX * layout.scale).toBeLessThanOrEqual(230 * 0.45 + 0.001);
    });

    it('leaves tall screens to the width alone', () => {
        const tall = getStageLayout(FULL_RANGE, DESKTOP, 600);
        const unbounded = getStageLayout(FULL_RANGE, DESKTOP);
        expect(tall.scale).toBeCloseTo(unbounded.scale, 5);
    });
});
